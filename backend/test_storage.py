import json 
import os
from pathlib import Path
from datetime import datetime, timedelta

from model import User, Users, DailyReservations, CourtReservations, TimeSlot
import storageManager

# Paths to sample storage files
BASE_DIR = Path(__file__).resolve().parents[1] / "storage"
USERS_FILE = BASE_DIR / "users.json"
RESERVATION_FILE = BASE_DIR / "Dailyreservations.json"


def test_load_users():
    """Test that users.json loads and validates correctly"""
    with open(USERS_FILE, "r") as f:
        data = json.load(f)
    
    # Create RootModel instance correctly
    users = Users(data)
    assert len(users.root) > 0, "users.json should not be empty"
    print("Users loaded successfully:", list(users.root.keys()))


def test_load_reservations():
    """Test that reservations JSON matches the DailyReservations schema"""
    with open(RESERVATION_FILE, "r") as f:
        data = json.load(f)

    # Create RootModel instance correctly
    reservations = DailyReservations(data)
    assert "Court A" in reservations.root, "Court A should be in the reservations"
    print("Reservations validated successfully")


def test_storage_manager_save_and_load(tmp_path):
    """Test that StorageManager can save and reload files"""
    storage = storageManager(storage_dir=tmp_path)
    
    # Example test data
    fake_data = {"Court Test": {"type": "Basketball", "capacity": 4, "timeslots": {}}}
    
    # Save data
    test_file = storage.save_json("reservations_day_test.json", fake_data)
    assert test_file.exists(), "File should be created"

    # Reload data
    loaded = storage.load_json("reservations_day_test.json")
    assert loaded == fake_data, "Data mismatch between saved and loaded JSON"
    print("StorageManager save/load works correctly")


def test_auto_delete_old_files(tmp_path):
    """Ensure only 10 most recent reservation files are kept"""
    storage = storageManager(storage_dir=tmp_path)
    
    # Create 12 dummy files
    for i in range(12):
        file_date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        path = tmp_path / f"reservations_{file_date}.json"
        with open(path, "w") as f:
            json.dump({}, f)
    
    storage.cleanup_old_files(days_to_keep=10)
    
    remaining = list(tmp_path.glob("reservations_*.json"))
    assert len(remaining) == 10, f"Expected 10 remaining files, found {len(remaining)}"
    print("Auto-delete old files works correctly")
    
# ---------------- SCHEMA TEST ----------------
if __name__ == "__main__":
    print("\n=== User Schema ===")
    print(User.model_json_schema())

    print("\n=== TimeSlot Schema ===")
    print(TimeSlot.model_json_schema())

    print("\n=== CourtReservation Schema ===")
    print(CourtReservations.model_json_schema())
    
    print("\n=== DailyReservations Schema ===")
    print(DailyReservations.model_json_schema())