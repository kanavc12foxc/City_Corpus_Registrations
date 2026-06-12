from flask import Flask, request, jsonify, session, send_file
from flask_cors import CORS
import os
import io
import pandas as pd
import db

app = Flask(__name__, static_folder='static', static_url_path='')
app.secret_key = 'CITY_CORPUS_SUPER_SECRET_KEY_2026_FEST'

# Enable CORS for development
CORS(app, supports_credentials=True)

# Initialize database
db.init_db()

# Event limits dictionary
EVENTS_CONFIG = {
    "City Skylines": {"type": "Real Estate Event", "max": 2},
    "CityCampaign - Marketing Event": {"type": "Marketing Event", "max": 4},
    "City Verdict": {"type": "Moot Court", "max": 2},
    "City Conquest": {"type": "Corporate Hunt", "max": 2},
    "City Heritage": {"type": "Hotel Management", "max": 2},
    "City Collapse": {"type": "Economic Crisis", "max": 2},
    "City Benevo": {"type": "Sustainable Solutions", "max": 2},
    "City Biz": {"type": "BizQuiz", "max": 3},
    "City Bulls": {"type": "Stock Exchange Event", "max": 2},
    "City Bid": {"type": "Football Auction", "max": 2},
    "City Recruit": {"type": "HRM Event", "max": 2}
}

# Serve Frontend SPA
@app.route('/')
@app.route('/admin')
def serve_index():
    return app.send_static_file('index.html')

# Authentication API
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    school_name = data.get('school_name', '').strip()
    password = data.get('password', '').strip()
    
    if not school_name or not password:
        return jsonify({"success": False, "message": "School name and password are required."}), 400
        
    school = db.get_school(school_name)
    if not school or school['password'] != password:
        return jsonify({"success": False, "message": "Invalid credentials. Please contact the City Corpus organising team."}), 401
        
    session['school'] = school_name
    return jsonify({"success": True, "school_name": school_name})

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('school', None)
    return jsonify({"success": True})

@app.route('/api/session', methods=['GET'])
def get_session():
    return jsonify({
        "school": session.get('school'),
        "admin": session.get('admin', False)
    })

# Registration API
@app.route('/api/register', methods=['POST'])
def register():
    # Enforce school login
    school_name = session.get('school')
    if not school_name:
        return jsonify({"success": False, "message": "Unauthorized. Please log in."}), 401
        
    data = request.get_json() or {}
    event_name = data.get('event_name', '').strip()
    participants = data.get('participants', [])
    
    if not event_name or not participants:
        return jsonify({"success": False, "message": "Event name and participants are required."}), 400
        
    if event_name not in EVENTS_CONFIG:
        return jsonify({"success": False, "message": "Invalid event selection."}), 400
        
    event_info = EVENTS_CONFIG[event_name]
    max_allowed = event_info["max"]
    
    # Server-side validation of participant count (strictly enforced)
    if len(participants) > max_allowed:
        return jsonify({
            "success": False, 
            "message": f"Error: You have entered more participants than permitted for this event. Maximum allowed is {max_allowed}. Please review and resubmit."
        }), 400
        
    # Standardize inputs
    p1 = participants[0].strip() if len(participants) > 0 else ""
    p2 = participants[1].strip() if len(participants) > 1 else ""
    p3 = participants[2].strip() if len(participants) > 2 else None
    
    if not p1 or not p2 or (max_allowed == 3 and not p3):
        return jsonify({"success": False, "message": "All participant names must be filled out."}), 400
        
    success, message = db.add_registration(school_name, event_name, p1, p2, p3)
    if not success:
        return jsonify({"success": False, "message": message}), 400
        
    return jsonify({
        "success": True, 
        "message": f"Registration successful! {school_name} has been registered for {event_name}."
    })

@app.route('/api/my-registrations', methods=['GET'])
def my_registrations():
    school_name = session.get('school')
    if not school_name:
        return jsonify({"success": False, "message": "Unauthorized."}), 401
        
    regs = db.get_registrations_by_school(school_name)
    return jsonify({"success": True, "registrations": regs})

# Admin Authentication
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json() or {}
    password = data.get('password', '').strip()
    
    if password == 'CITYCORPUS2026ADMIN':
        session['admin'] = True
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "message": "Incorrect admin password."}), 401

@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    session.pop('admin', None)
    return jsonify({"success": True})

# Admin School Manager API
@app.route('/api/admin/schools', methods=['GET', 'POST'])
def admin_schools():
    if not session.get('admin'):
        return jsonify({"success": False, "message": "Admin authorization required."}), 403
        
    if request.method == 'GET':
        schools = db.list_schools()
        return jsonify({"success": True, "schools": schools})
        
    elif request.method == 'POST':
        data = request.get_json() or {}
        name = data.get('school_name', '').strip()
        password = data.get('password', '').strip()
        action = data.get('action', 'add').strip()
        
        if not name or not password:
            return jsonify({"success": False, "message": "School name and password are required."}), 400
            
        if action == 'add':
            success, message = db.add_school(name, password)
        elif action == 'edit':
            success, message = db.update_school(name, password)
        else:
            return jsonify({"success": False, "message": "Invalid action."}), 400
            
        if not success:
            return jsonify({"success": False, "message": message}), 400
            
        return jsonify({"success": True, "message": message})

@app.route('/api/admin/schools/<name>', methods=['DELETE'])
def admin_delete_school(name):
    if not session.get('admin'):
        return jsonify({"success": False, "message": "Admin authorization required."}), 403
        
    success, message = db.delete_school(name)
    if not success:
        return jsonify({"success": False, "message": message}), 400
        
    return jsonify({"success": True, "message": message})

# Admin Registration View API
@app.route('/api/admin/registrations', methods=['GET'])
def admin_registrations():
    if not session.get('admin'):
        return jsonify({"success": False, "message": "Admin authorization required."}), 403
        
    regs = db.get_all_registrations()
    return jsonify({"success": True, "registrations": regs})

# Admin Excel Export API
@app.route('/api/admin/export', methods=['GET'])
def admin_export():
    if not session.get('admin'):
        return "Admin authorization required.", 403
        
    regs = db.get_all_registrations()
    
    # Create DataFrame with required columns
    df = pd.DataFrame(regs)
    if df.empty:
        df = pd.DataFrame(columns=['school_name', 'event_name', 'participant_1', 'participant_2', 'participant_3', 'timestamp'])
        
    # Reorder and rename columns
    df = df[['school_name', 'event_name', 'participant_1', 'participant_2', 'participant_3', 'timestamp']]
    df.columns = ['School Name', 'Event', 'Participant 1', 'Participant 2', 'Participant 3', 'Timestamp']
    
    # Save to Excel in-memory
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='CityCorpus2026_Registrations')
        
        # Access the workbook to apply styling (optional, but ensures sheet looks premium)
        workbook = writer.book
        worksheet = writer.sheets['CityCorpus2026_Registrations']
        # Set column widths nicely
        for col in worksheet.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = col[0].column_letter
            worksheet.column_dimensions[col_letter].width = max(max_len + 3, 12)
            
    output.seek(0)
    
    return send_file(
        output,
        as_attachment=True,
        download_name='CityCorpus2026_Registrations.xlsx',
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

if __name__ == '__main__':
    # Default port is 5001 or 5000, let's bind to 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
