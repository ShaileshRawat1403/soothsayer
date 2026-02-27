import time
from workspace_mcp.store import BoundedStore

def test_bounded_store_ttl_eviction_on_get(monkeypatch):
    store = BoundedStore[str, str](max_size=10, ttl_seconds=1)
    
    # Mock current time
    current_time = 1000.0
    monkeypatch.setattr(time, "time", lambda: current_time)
    
    store.set("k1", "v1")
    assert store.get("k1") == "v1"
    
    # Advance time past TTL
    monkeypatch.setattr(time, "time", lambda: current_time + 2.0)
    
    assert store.get("k1") is None
    assert len(store) == 0

def test_bounded_store_fifo_eviction_on_set_overflow():
    store = BoundedStore[str, int](max_size=3, ttl_seconds=60)
    
    store.set("k1", 1)
    store.set("k2", 2)
    store.set("k3", 3)
    
    assert len(store) == 3
    
    # This should evict "k1"
    store.set("k4", 4)
    
    assert len(store) == 3
    assert store.get("k1") is None
    assert store.get("k2") == 2
    assert store.get("k4") == 4

def test_bounded_store_last_seen_updates_on_get(monkeypatch):
    store = BoundedStore[str, str](max_size=3, ttl_seconds=60)
    
    current_time = 1000.0
    monkeypatch.setattr(time, "time", lambda: current_time)
    
    store.set("k1", "v1")
    store.set("k2", "v2")
    store.set("k3", "v3")
    
    # The oldest element is "k1"
    
    # Access "k1", which should update its last_seen_at and move it to the end (most recent)
    current_time += 10.0
    store.get("k1")
    
    # Now the oldest element should be "k2"
    
    # Add a new element to trigger eviction
    store.set("k4", "v4")
    
    assert store.get("k2") is None # k2 should be evicted
    assert store.get("k1") == "v1" # k1 should still exist