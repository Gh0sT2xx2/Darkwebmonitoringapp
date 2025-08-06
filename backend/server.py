from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pydantic import BaseModel
from typing import List, Optional
import os
import requests
import hashlib
import uuid
from datetime import datetime, timedelta
import asyncio
from contextlib import asynccontextmanager

# Database setup
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'darkweb_monitor')

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# Collections
breaches_collection = db.breaches
domains_collection = db.monitored_domains
alerts_collection = db.alerts

# Models
class DomainMonitor(BaseModel):
    domain: str
    email_patterns: List[str] = []
    created_at: Optional[datetime] = None

class BreachData(BaseModel):
    id: str
    breach_name: str
    domain: str
    emails_compromised: int
    breach_date: datetime
    data_classes: List[str]
    description: str
    verified: bool
    source: str

class AlertModel(BaseModel):
    id: str
    domain: str
    breach_name: str
    severity: str
    message: str
    created_at: datetime
    status: str = "active"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"🚀 Dark Web Monitor Server starting...")
    print(f"📊 Connected to MongoDB: {MONGO_URL}")
    print(f"💾 Using database: {DB_NAME}")
    yield
    # Shutdown
    print("🛑 Dark Web Monitor Server shutting down...")

app = FastAPI(
    title="Dark Web Monitor - An0ns4i",
    description="Advanced Dark Web Monitoring System for Leaked Credentials",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# HaveIBeenPwned API integration
HIBP_API_BASE = "https://haveibeenpwned.com/api/v3"

def get_hibp_headers():
    return {
        'User-Agent': 'DarkWebMonitor-An0ns4i/1.0',
        'hibp-api-key': os.environ.get('HIBP_API_KEY', '')
    }

@app.get("/api/health")
async def health_check():
    return {
        "status": "operational",
        "service": "Dark Web Monitor",
        "created_by": "An0ns4i",
        "version": "1.0.0",
        "database": "connected" if client.admin.command('ping') else "disconnected"
    }

@app.get("/api/dashboard/stats")
async def get_dashboard_stats():
    total_breaches = breaches_collection.count_documents({})
    monitored_domains = domains_collection.count_documents({})
    active_alerts = alerts_collection.count_documents({"status": "active"})
    
    # Get recent breaches
    recent_breaches = list(breaches_collection.find().sort("breach_date", -1).limit(5))
    
    # Convert ObjectId to string for JSON serialization
    for breach in recent_breaches:
        breach['_id'] = str(breach['_id'])
    
    return {
        "total_breaches": total_breaches,
        "monitored_domains": monitored_domains,
        "active_alerts": active_alerts,
        "recent_breaches": recent_breaches,
        "system_status": "operational"
    }

@app.get("/api/breaches/domain/{domain}")
async def get_domain_breaches(domain: str):
    try:
        # Check HaveIBeenPwned for breaches
        headers = get_hibp_headers()
        
        # Get breaches for domain (free endpoint)
        response = requests.get(f"{HIBP_API_BASE}/breaches", headers=headers, timeout=10)
        
        if response.status_code == 200:
            all_breaches = response.json()
            domain_breaches = [
                breach for breach in all_breaches 
                if domain.lower() in breach.get('Domain', '').lower()
            ]
            
            # Store in database
            for breach in domain_breaches:
                breach_id = str(uuid.uuid4())
                breach_data = {
                    "id": breach_id,
                    "breach_name": breach.get('Name', ''),
                    "domain": breach.get('Domain', ''),
                    "emails_compromised": breach.get('PwnCount', 0),
                    "breach_date": datetime.fromisoformat(breach.get('BreachDate', '2024-01-01')),
                    "data_classes": breach.get('DataClasses', []),
                    "description": breach.get('Description', ''),
                    "verified": breach.get('IsVerified', False),
                    "source": "HaveIBeenPwned",
                    "created_at": datetime.now()
                }
                
                # Upsert to avoid duplicates
                breaches_collection.update_one(
                    {"breach_name": breach_data["breach_name"]},
                    {"$set": breach_data},
                    upsert=True
                )
            
            return {"breaches": domain_breaches, "count": len(domain_breaches)}
        else:
            return {"breaches": [], "count": 0, "message": "API rate limit or error"}
            
    except Exception as e:
        return {"breaches": [], "count": 0, "error": str(e)}

@app.post("/api/domains/monitor")
async def add_domain_monitor(domain_data: DomainMonitor):
    domain_id = str(uuid.uuid4())
    domain_record = {
        "id": domain_id,
        "domain": domain_data.domain,
        "email_patterns": domain_data.email_patterns,
        "created_at": datetime.now(),
        "status": "active"
    }
    
    # Check if domain already exists
    existing = domains_collection.find_one({"domain": domain_data.domain})
    if existing:
        return {"message": "Domain already being monitored", "id": str(existing['_id'])}
    
    result = domains_collection.insert_one(domain_record)
    
    # Trigger initial scan
    try:
        await get_domain_breaches(domain_data.domain)
    except:
        pass  # Continue even if initial scan fails
    
    return {"message": "Domain monitoring activated", "id": str(result.inserted_id)}

@app.get("/api/domains/monitored")
async def get_monitored_domains():
    domains = list(domains_collection.find())
    for domain in domains:
        domain['_id'] = str(domain['_id'])
    return {"domains": domains}

@app.get("/api/search/email/{email}")
async def search_email_breaches(email: str):
    try:
        headers = get_hibp_headers()
        
        # Check if email has been pwned (requires API key for full access)
        # Using free breach search instead
        email_hash = hashlib.sha1(email.lower().encode()).hexdigest().upper()
        
        # Search in our database first
        domain = email.split('@')[1] if '@' in email else ''
        local_breaches = list(breaches_collection.find({
            "$or": [
                {"domain": {"$regex": domain, "$options": "i"}},
                {"emails_compromised": {"$gt": 0}}
            ]
        }).limit(20))
        
        for breach in local_breaches:
            breach['_id'] = str(breach['_id'])
        
        return {
            "email": email,
            "breaches_found": len(local_breaches),
            "breaches": local_breaches,
            "status": "scanned"
        }
        
    except Exception as e:
        return {"error": str(e), "breaches": [], "breaches_found": 0}

@app.get("/api/alerts")
async def get_alerts():
    alerts = list(alerts_collection.find().sort("created_at", -1).limit(50))
    for alert in alerts:
        alert['_id'] = str(alert['_id'])
    return {"alerts": alerts}

@app.post("/api/scan/comprehensive")
async def comprehensive_scan():
    """Perform comprehensive scan of all monitored domains"""
    try:
        domains = list(domains_collection.find())
        scan_results = []
        
        for domain in domains:
            domain_name = domain['domain']
            try:
                # Scan for breaches
                result = await get_domain_breaches(domain_name)
                scan_results.append({
                    "domain": domain_name,
                    "breaches_found": result.get('count', 0),
                    "status": "success"
                })
                
                # Create alert if new breaches found
                if result.get('count', 0) > 0:
                    alert_id = str(uuid.uuid4())
                    alert = {
                        "id": alert_id,
                        "domain": domain_name,
                        "breach_name": f"Multiple breaches detected",
                        "severity": "high" if result.get('count', 0) > 5 else "medium",
                        "message": f"Found {result.get('count', 0)} breaches for {domain_name}",
                        "created_at": datetime.now(),
                        "status": "active"
                    }
                    alerts_collection.insert_one(alert)
                
            except Exception as e:
                scan_results.append({
                    "domain": domain_name,
                    "status": "error",
                    "error": str(e)
                })
        
        return {
            "message": "Comprehensive scan completed",
            "scanned_domains": len(scan_results),
            "results": scan_results
        }
        
    except Exception as e:
        return {"error": str(e), "message": "Scan failed"}

@app.delete("/api/alerts/{alert_id}")
async def dismiss_alert(alert_id: str):
    result = alerts_collection.update_one(
        {"id": alert_id},
        {"$set": {"status": "dismissed", "dismissed_at": datetime.now()}}
    )
    return {"message": "Alert dismissed", "modified": result.modified_count}

@app.get("/")
async def root():
    return {
        "service": "Dark Web Monitor",
        "created_by": "An0ns4i", 
        "status": "operational",
        "endpoints": ["/api/health", "/api/dashboard/stats", "/api/breaches/domain/{domain}"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)