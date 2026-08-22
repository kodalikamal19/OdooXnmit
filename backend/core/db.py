"""
MongoDB connection utility using PyMongo.
All database access throughout the project uses this module.
"""
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

_client = None
_db = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        _client = MongoClient(uri)
    return _client


def get_db():
    global _db
    if _db is None:
        client = get_client()
        db_name = os.getenv("MONGODB_DATABASE", "odooxnmit")
        _db = client[db_name]
    return _db


# Collection helpers
def col(name: str):
    return get_db()[name]
