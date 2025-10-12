"""
Lobby Feature Backend
Handles viewing and joining existing court reservations
"""

import json
import os
from typing import List, Dict, Optional

# File paths
RESERVATIONS_FILE = "reservations.json"
USERS_FILE = "users.json"


def load_json(filepath: str) -> Dict:
    """Load data from JSON file - returns dictionary"""
    if not os.path.exists(filepath):
        return {}
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except json.JSONDecodeError:
        # File not existing returning empty dict to prevent error
        return {}


def save_json(filepath: str, data: Dict) -> bool:
    """Save data to JSON file"""
    try:
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving to {filepath}: {e}")
        return False


def get_user_by_id(user_id: str) -> Optional[Dict]:
    "Retrieving user's info"
    users = load_json(USERS_FILE)
    return users.get(user_id)


def list_available_reservations() -> List[Dict]:
    """
    List all available reservations that players can join
    Returns list of reservations with basic info
    """
    reservations = load_json(RESERVATIONS_FILE)
    available = []
    
    # Iterate through dictionary items
    for res_id, reservation in reservations.items():
        # Calculate current player count
        current_players = len(reservation.get("players", []))
        max_players = reservation.get("maxPlayers", 4)
        
        # Only show reservations that aren't full
        if current_players < max_players:
            available.append({
                "id": int(res_id),  # Convert string key back to int
                "name": reservation.get("name"),
                "court": reservation.get("court"),
                "timeslot": reservation.get("timeslot"),
                "currentPlayers": current_players,
                "maxPlayers": max_players
            })
    
    return available


def get_lobby_details(reservation_id: int) -> Optional[Dict]:
    """
    Get detailed information about a specific reservation/lobby
    Includes full player list with names - O(1) lookup
    """
    reservations = load_json(RESERVATIONS_FILE)
    
    # Direct O(1) dictionary lookup
    reservation = reservations.get(str(reservation_id))
    
    if not reservation:
        return None
    
    # Enrich player data with names
    players_with_names = []
    for player_id in reservation.get("players", []):
        user = get_user_by_id(player_id)
        if user:
            players_with_names.append({
                "id": player_id,
                "name": user.get("name", "Unknown")
            })
    
    return {
        "id": reservation_id,
        "name": reservation.get("name"),
        "court": reservation.get("court"),
        "timeslot": reservation.get("timeslot"),
        "players": players_with_names,
        "currentPlayers": len(players_with_names),
        "maxPlayers": reservation.get("maxPlayers", 4)
    }


def join_reservation(reservation_id: int, user_id: str) -> Dict:
    """
    Add a player to an existing reservation - Optimized with O(1) lookups
    Returns success status and message
    """
    # Verify user exists - O(1)
    user = get_user_by_id(user_id)
    if not user:
        return {"success": False, "message": "User not found"}
    
    reservations = load_json(RESERVATIONS_FILE)
    
    # Direct O(1) dictionary lookup
    res_key = str(reservation_id)
    reservation = reservations.get(res_key)
    
    if not reservation:
        return {"success": False, "message": "Reservation not found"}
    
    players = reservation.get("players", [])
    
    # Check if already joined - O(n) but unavoidable with list
    # Could use set for O(1) but JSON doesn't support sets
    if user_id in players:
        return {"success": False, "message": "Already joined this reservation"}
    
    # Check if room is full
    max_players = reservation.get("maxPlayers", 4)
    if len(players) >= max_players:
        return {"success": False, "message": "Reservation is full"}
    
    # Add player
    players.append(user_id)
    reservations[res_key]["players"] = players
    
    # Save changes
    if save_json(RESERVATIONS_FILE, reservations):
        return {
            "success": True,
            "message": f"Successfully joined {reservation.get('name')}",
            "currentPlayers": len(players),
            "maxPlayers": max_players
        }
    else:
        return {"success": False, "message": "Error saving reservation"}


def leave_reservation(reservation_id: int, user_id: str) -> Dict:
    """
    Remove a player from a reservation - Optimized with O(1) lookup
    Returns success status and message
    """
    reservations = load_json(RESERVATIONS_FILE)
    
    # Direct O(1) dictionary lookup
    res_key = str(reservation_id)
    reservation = reservations.get(res_key)
    
    if not reservation:
        return {"success": False, "message": "Reservation not found"}
    
    players = reservation.get("players", [])
    
    # Check if user is in the reservation
    if user_id not in players:
        return {"success": False, "message": "Not in this reservation"}
    
    # Remove player
    players.remove(user_id)
    reservations[res_key]["players"] = players
    
    # Save changes
    if save_json(RESERVATIONS_FILE, reservations):
        return {
            "success": True,
            "message": f"Successfully left {reservation.get('name')}",
            "currentPlayers": len(players),
            "maxPlayers": reservation.get("maxPlayers", 4)
        }
    else:
        return {"success": False, "message": "Error saving reservation"}


def main():
    """Test the lobby features"""
    print("=== Lobby Feature Backend ===\n")
    
    # Test 1: List available reservations
    print("Available Reservations:")
    available = list_available_reservations()
    for res in available:
        print(f"  - {res['name']} at {res['court']} ({res['currentPlayers']}/{res['maxPlayers']} players)")
    
    # Test 2: Get lobby details
    print("\nLobby Details for Reservation 1:")
    details = get_lobby_details(1)
    if details:
        print(f"  Name: {details['name']}")
        print(f"  Court: {details['court']}")
        print(f"  Time: {details['timeslot']}")
        print(f"  Players: {details['currentPlayers']}/{details['maxPlayers']}")
        for player in details['players']:
            print(f"    - {player['name']} ({player['id']})")
    
    # Test 3: Join a reservation
    print("\nTesting join reservation (Bob joining Reservation 1):")
    result = join_reservation(1, "2023002")
    print(f"  {result['message']}")
    if result['success']:
        print(f"  Now {result['currentPlayers']}/{result['maxPlayers']} players")
    
    # Test 4: Try joining again (should fail)
    print("\nTesting duplicate join (Bob joining again):")
    result = join_reservation(1, "2023002")
    print(f"  {result['message']}")
    
    # Test 5: Leave reservation
    print("\nTesting leave reservation (Bob leaving):")
    result = leave_reservation(1, "2023002")
    print(f"  {result['message']}")
    if result['success']:
        print(f"  Now {result['currentPlayers']}/{result['maxPlayers']} players")
    
    print("\n✅ All tests completed!")


if __name__ == "__main__":
    main()
