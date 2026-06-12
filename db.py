import os
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_client() -> Client:
    return supabase

def init_db():
    # No-op for Supabase — tables are managed via the Supabase dashboard.
    pass

def add_school(name, password):
    try:
        get_client().table("schools").insert({"name": name, "password": password}).execute()
        return True, "School added successfully."
    except Exception as e:
        err_msg = str(e)
        if "23505" in err_msg or "duplicate key" in err_msg or "already exists" in err_msg.lower():
            if "password" in err_msg.lower() or "schools_password_key" in err_msg:
                return False, "This password is already assigned to another school. Passwords must be unique."
            else:
                return False, "A school with this name already exists."
        return False, f"Database error: {err_msg}"

def update_school(name, new_password):
    try:
        response = get_client().table("schools").update({"password": new_password}).eq("name", name).execute()
        if not response.data:
            return False, "School not found."
        return True, "School password updated successfully."
    except Exception as e:
        err_msg = str(e)
        if "23505" in err_msg or "duplicate key" in err_msg or "password" in err_msg.lower():
            return False, "This password is already assigned to another school. Passwords must be unique."
        return False, f"Database error: {err_msg}"

def delete_school(name):
    try:
        response = get_client().table("schools").delete().eq("name", name).execute()
        if not response.data:
            return False, "School not found."
        return True, "School and its registrations deleted successfully."
    except Exception as e:
        return False, f"Database error: {str(e)}"

def get_school(name):
    try:
        response = get_client().table("schools").select("*").eq("name", name).execute()
        if response.data:
            return response.data[0]
    except Exception:
        pass
    return None

def list_schools():
    try:
        response = get_client().table("schools").select("*").order("name").execute()
        return response.data if response.data else []
    except Exception:
        return []

def add_registration(school_name, event_name, p1, p2, p3=None):
    try:
        get_client().table("registrations").insert({
            "school_name": school_name,
            "event_name": event_name,
            "participant_1": p1,
            "participant_2": p2,
            "participant_3": p3
        }).execute()
        return True, "Registration successful."
    except Exception as e:
        err_msg = str(e)
        if "23505" in err_msg or "duplicate key" in err_msg:
            return False, "Your school is already registered for this event."
        return False, f"Database error: {err_msg}"

def get_registrations_by_school(school_name):
    try:
        response = (get_client().table("registrations")
                    .select("event_name, participant_1, participant_2, participant_3, timestamp")
                    .eq("school_name", school_name)
                    .order("timestamp", desc=True)
                    .execute())
        return response.data if response.data else []
    except Exception:
        return []

def get_all_registrations():
    try:
        response = (get_client().table("registrations")
                    .select("school_name, event_name, participant_1, participant_2, participant_3, timestamp")
                    .order("timestamp", desc=True)
                    .execute())
        return response.data if response.data else []
    except Exception:
        return []

if __name__ == '__main__':
    print("Supabase db.py loaded. Tables are managed via the Supabase dashboard.")
