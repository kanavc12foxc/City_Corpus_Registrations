import unittest
import json
import os
import db
from app import app

class CityCorpusTestCase(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        # Configure app secret key and testing mode
        app.config['TESTING'] = True
        
    def setUp(self):
        # Reset database tables
        db.init_db()
        # Clear registrations and schools via Supabase client
        try:
            db.get_client().table("registrations").delete().neq("id", -1).execute()
            db.get_client().table("schools").delete().neq("name", "").execute()
        except Exception as e:
            print(f"Test setUp warning (failed to clear database): {e}")
        self.client = app.test_client()

    def test_database_school_crud(self):
        # Test adding a school
        success, msg = db.add_school("St. Mary's School", "stmary123")
        self.assertTrue(success)
        self.assertEqual(msg, "School added successfully.")
        
        # Test adding duplicate school name
        success, msg = db.add_school("St. Mary's School", "newpass12")
        self.assertFalse(success)
        self.assertIn("already exists", msg)
        
        # Test password uniqueness constraint (Each school has a unique password)
        success, msg = db.add_school("St. Jude's School", "stmary123") # same password
        self.assertFalse(success)
        self.assertIn("passwords must be unique", msg.lower())
        
        # Test updating school password
        success, msg = db.update_school("St. Mary's School", "newsecurepass")
        self.assertTrue(success)
        
        # Verify update
        school = db.get_school("St. Mary's School")
        self.assertEqual(school['password'], "newsecurepass")

    def test_login_flow(self):
        # Create test school
        db.add_school("High School X", "passX123")
        
        # Test login incorrect name
        resp = self.client.post('/api/login', json={
            "school_name": "Nonexistent",
            "password": "passX123"
        })
        self.assertEqual(resp.status_code, 401)
        data = json.loads(resp.data)
        self.assertFalse(data['success'])
        self.assertEqual(data['message'], "Invalid credentials. Please contact the City Corpus organising team.")
        
        # Test login incorrect password
        resp = self.client.post('/api/login', json={
            "school_name": "High School X",
            "password": "wrongpassword"
        })
        self.assertEqual(resp.status_code, 401)
        data = json.loads(resp.data)
        self.assertFalse(data['success'])
        self.assertEqual(data['message'], "Invalid credentials. Please contact the City Corpus organising team.")
        
        # Test login correct
        resp = self.client.post('/api/login', json={
            "school_name": "High School X",
            "password": "passX123"
        })
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertTrue(data['success'])
        self.assertEqual(data['school_name'], "High School X")

    def test_registration_flow_and_validation(self):
        # 1. Add school
        db.add_school("Beacon Academy", "beaconPass1")
        
        # 2. Login to set session cookie
        self.client.post('/api/login', json={
            "school_name": "Beacon Academy",
            "password": "beaconPass1"
        })
        
        # 3. Register for City Verdict (Moot Court) - Max 2
        resp = self.client.post('/api/register', json={
            "event_name": "City Verdict",
            "participants": ["Jane Doe", "John Smith"]
        })
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertTrue(data['success'])
        self.assertEqual(data['message'], "Registration successful! Beacon Academy has been registered for City Verdict.")
        
        # 4. Prevent duplicate registration (same event twice)
        resp = self.client.post('/api/register', json={
            "event_name": "City Verdict",
            "participants": ["Jane Doe", "John Smith"]
        })
        self.assertEqual(resp.status_code, 400)
        data = json.loads(resp.data)
        self.assertFalse(data['success'])
        self.assertEqual(data['message'], "Your school is already registered for this event.")
        
        # 5. Validation rule: more participants than permitted (City Verdict max 2, sending 3)
        # Must return exact message: "Error: You have entered more participants than permitted for this event. Maximum allowed is [X]. Please review and resubmit."
        resp = self.client.post('/api/register', json={
            "event_name": "City Verdict",
            "participants": ["Jane Doe", "John Smith", "Bypass Boy"]
        })
        self.assertEqual(resp.status_code, 400)
        data = json.loads(resp.data)
        self.assertFalse(data['success'])
        self.assertEqual(
            data['message'], 
            "Error: You have entered more participants than permitted for this event. Maximum allowed is 2. Please review and resubmit."
        )

        # 6. Test registering for City Biz (BizQuiz) - Max 3
        resp = self.client.post('/api/register', json={
            "event_name": "City Biz",
            "participants": ["Jane Doe", "John Smith", "Alex Mercer"]
        })
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertTrue(data['success'])

    def test_admin_gate_and_actions(self):
        # Try listing schools without admin login (should fail)
        resp = self.client.get('/api/admin/schools')
        self.assertEqual(resp.status_code, 403)
        
        # Login with incorrect master admin password
        resp = self.client.post('/api/admin/login', json={"password": "WRONGPASSWORD"})
        self.assertEqual(resp.status_code, 401)
        
        # Login with correct master admin password
        resp = self.client.post('/api/admin/login', json={"password": "CITYCORPUS2026ADMIN"})
        self.assertEqual(resp.status_code, 200)
        
        # Admin action: add school
        resp = self.client.post('/api/admin/schools', json={
            "school_name": "Admin Test School",
            "password": "testpassword1",
            "action": "add"
        })
        self.assertEqual(resp.status_code, 200)
        
        # Admin action: edit school
        resp = self.client.post('/api/admin/schools', json={
            "school_name": "Admin Test School",
            "password": "newtestpassword",
            "action": "edit"
        })
        self.assertEqual(resp.status_code, 200)
        
        # Verify school list plaintext passwords
        resp = self.client.get('/api/admin/schools')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        schools = data['schools']
        self.assertTrue(any(s['name'] == "Admin Test School" and s['password'] == "newtestpassword" for s in schools))
        
        # Admin action: delete school
        resp = self.client.delete('/api/admin/schools/Admin Test School')
        self.assertEqual(resp.status_code, 200)
        
        # Verify school is deleted
        resp = self.client.get('/api/admin/schools')
        data = json.loads(resp.data)
        schools = data['schools']
        self.assertFalse(any(s['name'] == "Admin Test School" for s in schools))

if __name__ == '__main__':
    unittest.main()
