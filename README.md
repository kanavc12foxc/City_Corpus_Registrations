# City Corpus 2026 - Event Registration Website

A full-stack event registration website for the "City Corpus 2026" school inter-school fest, built using a Flask backend, SQLite persistent database, and a responsive custom dark navy and gold SPA frontend.

## Features Built

- **Page 1: School Login**: Secure, unique credentials-based login for schools. Features incorrect password error banners.
- **Page 2: Registration Portal**: Once logged in, schools can register for events. Includes:
  - Scrollable event picker showing all 11 events with their fest category brackets.
  - Dynamically generated participant name fields matching the event's limits (most require 2, City Biz requires 3).
  - Strict validator checks that show error banners on excess participants (e.g. DOM injection) and duplicate registrations.
  - A summary table displaying the logged-in school's registrations.
- **Page 3: Admin Panel**: Accessible via the hidden route `/admin` or the footer links. Features:
  - Login protection using the master password `CITYCORPUS2026ADMIN`.
  - **School Password Manager**: Add new schools, generate random 8-character alphanumeric passwords, edit passwords, and delete schools (releasing registrations). Shows passwords in plaintext for organizer convenience.
  - **Registration Overview**: View all registrations with filters for specific schools and event types.
  - **Export to Excel (.xlsx)**: A one-click button compiling database records into a cleanly formatted Microsoft Excel spreadsheet named `CityCorpus2026_Registrations.xlsx` via Pandas.

---

## File Structure

- [db.py](file:///Users/kanavchand/Downloads/Registrations_City_Corpus/db.py) - SQLite tables configuration, credentials operations, and registration queries.
- [app.py](file:///Users/kanavchand/Downloads/Registrations_City_Corpus/app.py) - Flask application serving static assets and REST API endpoints.
- [verify.py](file:///Users/kanavchand/Downloads/Registrations_City_Corpus/verify.py) - Automated unit testing suite.
- [static/index.html](file:///Users/kanavchand/Downloads/Registrations_City_Corpus/static/index.html) - Main layout view wrapper.
- [static/style.css](file:///Users/kanavchand/Downloads/Registrations_City_Corpus/static/style.css) - Gold and deep navy styling with responsiveness and custom animations.
- [static/app.js](file:///Users/kanavchand/Downloads/Registrations_City_Corpus/static/app.js) - Client-side state routing, custom elements generation, and API fetching.

---

## How to Run

### 1. Run the Application
Start the Flask development server by running:
```bash
python3 app.py
```
This will run the server locally. Open your browser and navigate to:
- **School Portal**: [http://localhost:5000/](http://localhost:5000/)
- **Admin Panel**: [http://localhost:5000/admin](http://localhost:5000/admin) (or click "Admin Panel" in the footer)

### 2. Add Your First School
1. Open [http://localhost:5000/admin](http://localhost:5000/admin).
2. Enter the default master admin password: `CITYCORPUS2026ADMIN`.
3. Under the "Schools Password Manager" tab, click **+ Add School**.
4. Enter the school name, choose to write or click **Generate** to get an 8-character password, and click **Save School**.
5. The school will appear in the table and can now log in from the main portal homepage.

### 3. Run Automated Tests
You can run the full verification test suite by executing:
```bash
python3 verify.py
```
