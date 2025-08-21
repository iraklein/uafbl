#!/usr/bin/env python3
import requests
import json

try:
    response = requests.get('http://localhost:3006/api/players')
    players = response.json()
    
    vernon_players = []
    for player in players:
        name = player['name'].lower()
        if 'vernon' in name or 'carey' in name:
            vernon_players.append(player)
    
    print("Vernon/Carey players found:")
    for player in vernon_players:
        print(f"ID {player['id']}: {player['name']}")
        
except Exception as e:
    print(f"Error: {e}")