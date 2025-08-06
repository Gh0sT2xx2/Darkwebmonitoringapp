import requests
import sys
import json
from datetime import datetime

class DarkWebMonitorTester:
    def __init__(self, base_url="https://d4d8409d-d608-4500-8978-00c09e49e479.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=30):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=timeout)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        return self.run_test("Health Check", "GET", "api/health", 200)

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        return self.run_test("Dashboard Stats", "GET", "api/dashboard/stats", 200)

    def test_domain_breaches(self, domain):
        """Test domain breach search"""
        return self.run_test(f"Domain Breaches ({domain})", "GET", f"api/breaches/domain/{domain}", 200)

    def test_email_search(self, email):
        """Test email breach search"""
        return self.run_test(f"Email Search ({email})", "GET", f"api/search/email/{email}", 200)

    def test_add_domain_monitor(self, domain):
        """Test adding domain to monitor"""
        data = {"domain": domain, "email_patterns": []}
        return self.run_test(f"Add Domain Monitor ({domain})", "POST", "api/domains/monitor", 200, data)

    def test_get_monitored_domains(self):
        """Test getting monitored domains"""
        return self.run_test("Get Monitored Domains", "GET", "api/domains/monitored", 200)

    def test_get_alerts(self):
        """Test getting alerts"""
        return self.run_test("Get Alerts", "GET", "api/alerts", 200)

    def test_comprehensive_scan(self):
        """Test comprehensive scan"""
        return self.run_test("Comprehensive Scan", "POST", "api/scan/comprehensive", 200, {})

def main():
    print("🛡️  Dark Web Monitor API Testing")
    print("=" * 50)
    
    tester = DarkWebMonitorTester()
    
    # Test 1: Health Check
    success, _ = tester.test_health_check()
    if not success:
        print("❌ Health check failed - stopping tests")
        return 1

    # Test 2: Dashboard Stats
    tester.test_dashboard_stats()

    # Test 3: Domain Breach Search (known compromised domains)
    test_domains = ["adobe.com", "dropbox.com", "linkedin.com"]
    for domain in test_domains:
        tester.test_domain_breaches(domain)

    # Test 4: Email Search
    test_emails = ["test@adobe.com", "user@dropbox.com"]
    for email in test_emails:
        tester.test_email_search(email)

    # Test 5: Add Domain Monitoring
    monitor_domains = ["example.com", "testdomain.org"]
    for domain in monitor_domains:
        tester.test_add_domain_monitor(domain)

    # Test 6: Get Monitored Domains
    tester.test_get_monitored_domains()

    # Test 7: Get Alerts
    tester.test_get_alerts()

    # Test 8: Comprehensive Scan
    tester.test_comprehensive_scan()

    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())