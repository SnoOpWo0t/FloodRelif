import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import type { User, AssistanceRequest, UrgencyLevel, RequestStatus, InventoryItem, DashboardStats, VolunteerTask } from './types';
import * as api from './api';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState<'requests' | 'inventory' | 'tasks'>('requests');

  // Filter states
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterUrgency, setFilterUrgency] = useState<string>('all');
  const [invCategoryFilter, setInvCategoryFilter] = useState<string>('all');
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('all');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'user' | 'admin'>('user');

  // Request form states (User)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [urgency, setUrgency] = useState<UrgencyLevel>('medium');

  // Inventory form states (Admin)
  const [itemName, setItemName] = useState('');
  const [itemCat, setItemCat] = useState('Food');
  const [itemQty, setItemQty] = useState(100);
  const [itemUnit, setItemUnit] = useState('packs');
  const [itemLoc, setItemLoc] = useState('Central Warehouse');

  // Volunteer Task form states (Admin)
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskLoc, setTaskLoc] = useState('');
  const [taskUrg, setTaskUrg] = useState<UrgencyLevel>('medium');

  // Fulfill Modal states (Admin)
  const [fulfillModalRequest, setFulfillModalRequest] = useState<AssistanceRequest | null>(null);
  const [fulfillNotes, setFulfillNotes] = useState('');
  const [fulfillItemId, setFulfillItemId] = useState<number | ''>('');
  const [fulfillQty, setFulfillQty] = useState<number>(10);

  // Data states
  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [tasks, setTasks] = useState<VolunteerTask[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadRequests();
      loadInventory();
      loadTasks();
      if (currentUser.role === 'admin') {
        loadStats();
      }
    }
  }, [currentUser, filterStatus, filterUrgency, taskStatusFilter]);

  async function loadUser() {
    try {
      const user = await api.getMe();
      setCurrentUser(user);
    } catch {
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const s = await api.fetchStats();
      setStats(s);
    } catch {
      // ignore
    }
  }

  async function loadRequests() {
    try {
      const data = await api.fetchRequests(filterStatus, filterUrgency);
      setRequests(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function loadInventory() {
    try {
      const data = await api.fetchInventory();
      setInventory(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function loadTasks() {
    try {
      const data = await api.fetchTasks(taskStatusFilter);
      setTasks(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleAuth(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (authMode === 'login') {
        const user = await api.login(email, password);
        setCurrentUser(user);
      } else {
        const user = await api.register(name, email, password, selectedRole);
        setCurrentUser(user);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleLogout() {
    await api.logout();
    setCurrentUser(null);
    setRequests([]);
    setInventory([]);
    setTasks([]);
    setStats(null);
  }

  async function handleCreateRequest(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.submitRequest({ title, description, location, urgency });
      setTitle('');
      setDescription('');
      setLocation('');
      setUrgency('medium');
      setSuccessMsg('Assistance request submitted successfully!');
      loadRequests();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleStatusChange(id: number, status: RequestStatus, notes?: string) {
    setErrorMsg(null);
    try {
      await api.updateRequestStatus(id, { status, admin_notes: notes });
      loadRequests();
      if (currentUser?.role === 'admin') loadStats();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleFulfillSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fulfillModalRequest) return;
    setErrorMsg(null);

    try {
      await api.updateRequestStatus(fulfillModalRequest.id, {
        status: 'fulfilled',
        admin_notes: fulfillNotes || undefined,
        allocated_item_id: fulfillItemId ? Number(fulfillItemId) : undefined,
        allocated_quantity: fulfillItemId ? fulfillQty : undefined,
      });
      setSuccessMsg(`Request #${fulfillModalRequest.id} marked fulfilled with allocated supplies!`);
      setFulfillModalRequest(null);
      setFulfillNotes('');
      setFulfillItemId('');
      loadRequests();
      loadInventory();
      loadStats();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleAddInventory(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.createInventoryItem({
        item_name: itemName,
        category: itemCat,
        quantity: itemQty,
        unit: itemUnit,
        location: itemLoc,
      });
      setItemName('');
      setItemQty(100);
      setSuccessMsg('Inventory item added successfully!');
      loadInventory();
      if (currentUser?.role === 'admin') loadStats();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleQuantityDelta(id: number, currentQty: number, delta: number) {
    const newQty = Math.max(0, currentQty + delta);
    try {
      await api.updateInventoryQuantity(id, newQty);
      loadInventory();
      if (currentUser?.role === 'admin') loadStats();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleDeleteItem(id: number) {
    if (!confirm('Are you sure you want to delete this inventory item?')) return;
    try {
      await api.deleteInventoryItem(id);
      loadInventory();
      if (currentUser?.role === 'admin') loadStats();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleCreateTask(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.createVolunteerTask({
        title: taskTitle,
        description: taskDesc,
        location: taskLoc,
        urgency: taskUrg,
      });
      setTaskTitle('');
      setTaskDesc('');
      setTaskLoc('');
      setSuccessMsg('Field task created successfully!');
      loadTasks();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleClaimTask(id: number) {
    setErrorMsg(null);
    try {
      await api.claimVolunteerTask(id);
      setSuccessMsg('You have successfully claimed this task! Thank you for volunteering.');
      loadTasks();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleCompleteTask(id: number) {
    setErrorMsg(null);
    try {
      await api.completeVolunteerTask(id);
      setSuccessMsg('Task marked as completed!');
      loadTasks();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  const filteredInventory = invCategoryFilter === 'all'
    ? inventory
    : inventory.filter(i => i.category.toLowerCase() === invCategoryFilter.toLowerCase());

  if (loading) {
    return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Loading FloodRelief...</div>;
  }

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <span>🌊</span> FloodRelief
          <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#64748b' }}>PERN MVP</span>
        </div>

        {currentUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span>
              <strong>{currentUser.name}</strong>{' '}
              <span className={`badge ${currentUser.role === 'admin' ? 'badge-critical' : 'badge-verified'}`}>
                {currentUser.role}
              </span>
            </span>
            <button onClick={handleLogout} className="btn btn-outline btn-sm">Logout</button>
          </div>
        )}
      </header>

      {/* Global Alerts */}
      {errorMsg && <div className="alert-error">{errorMsg}</div>}
      {successMsg && <div className="alert-success">{successMsg}</div>}

      {/* NOT LOGGED IN */}
      {!currentUser && (
        <div style={{ maxWidth: '420px', margin: '2rem auto' }} className="card">
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <button
              onClick={() => { setAuthMode('login'); setErrorMsg(null); }}
              className={`btn ${authMode === 'login' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1 }}
            >
              Login
            </button>
            <button
              onClick={() => { setAuthMode('register'); setErrorMsg(null); }}
              className={`btn ${authMode === 'register' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1 }}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuth}>
            {authMode === 'register' && (
              <>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    className="input"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div className="form-group">
                  <label>Account Role</label>
                  <select
                    className="input"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as 'user' | 'admin')}
                  >
                    <option value="user">User (Submit Requests & Volunteer)</option>
                    <option value="admin">Admin (Verify Requests, Assign Tasks & Stock)</option>
                  </select>
                </div>
              </>
            )}

            <div className="form-group">
              <label>Email Address</label>
              <input
                className="input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                className="input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      )}

      {/* LOGGED IN: Tab Navigation */}
      {currentUser && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setActiveTab('requests'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`btn ${activeTab === 'requests' ? 'btn-primary' : 'btn-outline'}`}
          >
            📋 Assistance Requests ({requests.length})
          </button>
          <button
            onClick={() => { setActiveTab('inventory'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`btn ${activeTab === 'inventory' ? 'btn-primary' : 'btn-outline'}`}
          >
            📦 Relief Supplies ({inventory.length})
          </button>
          <button
            onClick={() => { setActiveTab('tasks'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`btn ${activeTab === 'tasks' ? 'btn-primary' : 'btn-outline'}`}
          >
            🤝 Volunteer Tasks ({tasks.length})
          </button>
        </div>
      )}

      {/* ADMIN STATS BAR */}
      {currentUser && currentUser.role === 'admin' && stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Requests</div>
            <div className="stat-value">{stats.requests.total_requests}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pending Verification</div>
            <div className="stat-value" style={{ color: '#d97706' }}>{stats.requests.pending_requests}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Verified & Active</div>
            <div className="stat-value" style={{ color: '#2563eb' }}>{stats.requests.verified_requests}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Fulfilled</div>
            <div className="stat-value" style={{ color: '#16a34a' }}>{stats.requests.fulfilled_requests}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Critical Pending</div>
            <div className="stat-value" style={{ color: '#dc2626' }}>{stats.requests.critical_unresolved}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Low Stock Items</div>
            <div className="stat-value" style={{ color: stats.inventory.low_stock_items > 0 ? '#dc2626' : '#16a34a' }}>
              {stats.inventory.low_stock_items}
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: REQUESTS */}
      {currentUser && activeTab === 'requests' && (
        <>
          {/* USER VIEW */}
          {currentUser.role === 'user' && (
            <div>
              <div className="card">
                <h2 style={{ marginBottom: '1rem', fontSize: '1.15rem' }}>Submit Flood Relief Request</h2>
                <form onSubmit={handleCreateRequest}>
                  <div className="form-group">
                    <label>Need Title</label>
                    <input
                      className="input"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Emergency drinking water & dry food"
                    />
                  </div>

                  <div className="form-group">
                    <label>Description & Families Affected</label>
                    <textarea
                      className="input"
                      rows={3}
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Provide details about the situation..."
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Location / Landmark</label>
                      <input
                        className="input"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Sylhet, Ward 4 near Primary School"
                      />
                    </div>

                    <div className="form-group">
                      <label>Urgency Level</label>
                      <select
                        className="input"
                        value={urgency}
                        onChange={(e) => setUrgency(e.target.value as UrgencyLevel)}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                    Submit Request
                  </button>
                </form>
              </div>

              <div className="card">
                <h2 style={{ marginBottom: '1rem', fontSize: '1.15rem' }}>My Requests ({requests.length})</h2>
                {requests.length === 0 ? (
                  <p style={{ color: '#64748b' }}>You haven't submitted any requests yet.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Location</th>
                          <th>Urgency</th>
                          <th>Status</th>
                          <th>Relief Details & Notes</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requests.map((r) => (
                          <tr key={r.id}>
                            <td>
                              <strong>{r.title}</strong>
                              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{r.description}</div>
                            </td>
                            <td>{r.location || 'N/A'}</td>
                            <td><span className={`badge badge-${r.urgency}`}>{r.urgency}</span></td>
                            <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                            <td>
                              {r.allocated_item_name ? (
                                <div style={{ fontSize: '0.85rem', color: '#166534' }}>
                                  🎁 <strong>Allocated:</strong> {r.allocated_quantity} {r.allocated_unit} of {r.allocated_item_name}
                                </div>
                              ) : null}
                              {r.admin_notes && (
                                <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                                  Note: {r.admin_notes}
                                </div>
                              )}
                              {!r.allocated_item_name && !r.admin_notes && <span style={{ color: '#94a3b8' }}>-</span>}
                            </td>
                            <td style={{ fontSize: '0.85rem' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ADMIN VIEW */}
          {currentUser.role === 'admin' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem' }}>Admin Relief Operations</h2>
                  <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Review, verify, and allocate inventory to requests.</p>
                </div>
                <button onClick={loadRequests} className="btn btn-outline btn-sm">Refresh List</button>
              </div>

              {/* Filters */}
              <div className="filter-bar">
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Status:</span>
                {['all', 'pending', 'verified', 'fulfilled', 'rejected'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`filter-pill ${filterStatus === s ? 'active' : ''}`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}

                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginLeft: '1rem' }}>Urgency:</span>
                {['all', 'critical', 'high', 'medium', 'low'].map((u) => (
                  <button
                    key={u}
                    onClick={() => setFilterUrgency(u)}
                    className={`filter-pill ${filterUrgency === u ? 'active' : ''}`}
                  >
                    {u.charAt(0).toUpperCase() + u.slice(1)}
                  </button>
                ))}
              </div>

              {requests.length === 0 ? (
                <p style={{ color: '#64748b', marginTop: '1rem' }}>No assistance requests match the selected filters.</p>
              ) : (
                <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Submitter</th>
                        <th>Request Details</th>
                        <th>Location</th>
                        <th>Urgency</th>
                        <th>Status</th>
                        <th>Allocated Supplies / Notes</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((r) => (
                        <tr key={r.id}>
                          <td>#{r.id}</td>
                          <td>
                            <div><strong>{r.user_name}</strong></div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{r.user_email}</div>
                          </td>
                          <td>
                            <strong>{r.title}</strong>
                            <div style={{ fontSize: '0.85rem', color: '#475569' }}>{r.description}</div>
                          </td>
                          <td>{r.location || 'N/A'}</td>
                          <td><span className={`badge badge-${r.urgency}`}>{r.urgency}</span></td>
                          <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                          <td>
                            {r.allocated_item_name ? (
                              <div style={{ fontSize: '0.85rem', color: '#166534' }}>
                                🎁 {r.allocated_quantity} {r.allocated_unit} ({r.allocated_item_name})
                              </div>
                            ) : null}
                            {r.admin_notes && (
                              <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                                {r.admin_notes}
                              </div>
                            )}
                            {!r.allocated_item_name && !r.admin_notes && <span style={{ color: '#94a3b8' }}>-</span>}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                              {r.status !== 'verified' && r.status !== 'fulfilled' && (
                                <button
                                  onClick={() => handleStatusChange(r.id, 'verified')}
                                  className="btn btn-outline btn-sm"
                                  style={{ color: '#2563eb' }}
                                >
                                  Verify
                                </button>
                              )}
                              {r.status !== 'fulfilled' && (
                                <button
                                  onClick={() => {
                                    setFulfillModalRequest(r);
                                    setFulfillNotes('');
                                    setFulfillItemId(inventory[0]?.id || '');
                                    setFulfillQty(10);
                                  }}
                                  className="btn btn-primary btn-sm"
                                >
                                  Fulfill & Stock
                                </button>
                              )}
                              {r.status !== 'rejected' && r.status !== 'fulfilled' && (
                                <button
                                  onClick={() => handleStatusChange(r.id, 'rejected')}
                                  className="btn btn-outline btn-sm"
                                  style={{ color: '#dc2626' }}
                                >
                                  Reject
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* TAB 2: INVENTORY */}
      {currentUser && activeTab === 'inventory' && (
        <div>
          {/* Admin Add Supply Form */}
          {currentUser.role === 'admin' && (
            <div className="card">
              <h2 style={{ marginBottom: '1rem', fontSize: '1.15rem' }}>Add Warehouse Supply Item</h2>
              <form onSubmit={handleAddInventory}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Item Name</label>
                    <input
                      className="input"
                      required
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="e.g. Oral Rehydration Salts"
                    />
                  </div>

                  <div className="form-group">
                    <label>Category</label>
                    <select
                      className="input"
                      value={itemCat}
                      onChange={(e) => setItemCat(e.target.value)}
                    >
                      <option value="Water">Water</option>
                      <option value="Food">Food</option>
                      <option value="Medical">Medical</option>
                      <option value="Rescue">Rescue</option>
                      <option value="Shelter">Shelter</option>
                      <option value="Sanitation">Sanitation</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Quantity</label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      required
                      value={itemQty}
                      onChange={(e) => setItemQty(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Unit</label>
                    <input
                      className="input"
                      required
                      value={itemUnit}
                      onChange={(e) => setItemUnit(e.target.value)}
                      placeholder="liters, kits, boxes"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Hub / Warehouse Location</label>
                  <input
                    className="input"
                    value={itemLoc}
                    onChange={(e) => setItemLoc(e.target.value)}
                    placeholder="e.g. Sylhet Main Hub"
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                  + Add Stock Item
                </button>
              </form>
            </div>
          )}

          {/* Inventory Table */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem' }}>Relief Supplies Inventory</h2>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  {currentUser.role === 'admin'
                    ? 'Manage warehouse inventory and adjust emergency relief levels.'
                    : 'Current live emergency relief supplies available at distribution hubs.'}
                </p>
              </div>
              <button onClick={loadInventory} className="btn btn-outline btn-sm">Refresh Stock</button>
            </div>

            {/* Category Filter */}
            <div className="filter-bar">
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Category:</span>
              {['all', 'Water', 'Food', 'Medical', 'Rescue', 'Shelter', 'Sanitation'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setInvCategoryFilter(cat)}
                  className={`filter-pill ${invCategoryFilter.toLowerCase() === cat.toLowerCase() ? 'active' : ''}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {filteredInventory.length === 0 ? (
              <p style={{ color: '#64748b', marginTop: '1rem' }}>No inventory items recorded in this category.</p>
            ) : (
              <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Supply Item</th>
                      <th>Category</th>
                      <th>Available Quantity</th>
                      <th>Warehouse Location</th>
                      {currentUser.role === 'admin' && <th>Quick Stock Adjust</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((item) => (
                      <tr key={item.id}>
                        <td><strong>{item.item_name}</strong></td>
                        <td>
                          <span className="badge badge-low">{item.category}</span>
                        </td>
                        <td>
                          <strong style={{ fontSize: '1.05rem', color: item.quantity === 0 ? '#ef4444' : item.quantity < 50 ? '#d97706' : '#10b981' }}>
                            {item.quantity}
                          </strong>{' '}
                          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{item.unit}</span>
                          {item.quantity < 50 && (
                            <span className="badge badge-critical" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>
                              Low
                            </span>
                          )}
                        </td>
                        <td>{item.location}</td>
                        {currentUser.role === 'admin' && (
                          <td>
                            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                              <button
                                onClick={() => handleQuantityDelta(item.id, item.quantity, -10)}
                                className="btn btn-outline btn-sm"
                                title="Deduct 10"
                              >
                                -10
                              </button>
                              <button
                                onClick={() => handleQuantityDelta(item.id, item.quantity, 10)}
                                className="btn btn-outline btn-sm"
                                title="Add 10"
                              >
                                +10
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="btn btn-outline btn-sm"
                                style={{ color: '#ef4444', marginLeft: '0.5rem' }}
                                title="Delete item"
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: VOLUNTEER TASKS */}
      {currentUser && activeTab === 'tasks' && (
        <div>
          {/* Admin Create Task Form */}
          {currentUser.role === 'admin' && (
            <div className="card">
              <h2 style={{ marginBottom: '1rem', fontSize: '1.15rem' }}>Dispatch New Volunteer Field Task</h2>
              <form onSubmit={handleCreateTask}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Task Mission Title</label>
                    <input
                      className="input"
                      required
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="e.g. Distribute water rations to West Shelter"
                    />
                  </div>

                  <div className="form-group">
                    <label>Urgency Level</label>
                    <select
                      className="input"
                      value={taskUrg}
                      onChange={(e) => setTaskUrg(e.target.value as UrgencyLevel)}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Field Location / Drop-off Point</label>
                  <input
                    className="input"
                    value={taskLoc}
                    onChange={(e) => setTaskLoc(e.target.value)}
                    placeholder="e.g. Sylhet Sadar Bypass Junction"
                  />
                </div>

                <div className="form-group">
                  <label>Instructions for Field Volunteer</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    placeholder="Provide details about boat requirement, contact person, etc."
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                  + Dispatch Task
                </button>
              </form>
            </div>
          )}

          {/* Tasks List */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem' }}>Volunteer Field Tasks</h2>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  Community volunteers can claim open missions and mark them completed once executed.
                </p>
              </div>
              <button onClick={loadTasks} className="btn btn-outline btn-sm">Refresh Tasks</button>
            </div>

            {/* Task Filters */}
            <div className="filter-bar">
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Filter:</span>
              {['all', 'open', 'claimed', 'completed'].map((st) => (
                <button
                  key={st}
                  onClick={() => setTaskStatusFilter(st)}
                  className={`filter-pill ${taskStatusFilter === st ? 'active' : ''}`}
                >
                  {st.charAt(0).toUpperCase() + st.slice(1)}
                </button>
              ))}
            </div>

            {tasks.length === 0 ? (
              <p style={{ color: '#64748b', marginTop: '1rem' }}>No volunteer tasks in this view.</p>
            ) : (
              <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mission</th>
                      <th>Location</th>
                      <th>Urgency</th>
                      <th>Status</th>
                      <th>Assigned Volunteer</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <strong>{t.title}</strong>
                          {t.description && (
                            <div style={{ fontSize: '0.85rem', color: '#475569' }}>{t.description}</div>
                          )}
                        </td>
                        <td>{t.location || 'N/A'}</td>
                        <td><span className={`badge badge-${t.urgency}`}>{t.urgency}</span></td>
                        <td>
                          <span className={`badge ${t.status === 'open' ? 'badge-pending' : t.status === 'claimed' ? 'badge-verified' : 'badge-fulfilled'}`}>
                            {t.status}
                          </span>
                        </td>
                        <td>
                          {t.volunteer_name ? (
                            <div>
                              <strong>{t.volunteer_name}</strong>
                              {t.assigned_user_id === currentUser.id && (
                                <span className="badge badge-verified" style={{ marginLeft: '0.4rem', fontSize: '0.65rem' }}>You</span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>Unassigned</span>
                          )}
                        </td>
                        <td>
                          {t.status === 'open' && (
                            <button
                              onClick={() => handleClaimTask(t.id)}
                              className="btn btn-primary btn-sm"
                            >
                              Claim Mission
                            </button>
                          )}
                          {t.status === 'claimed' && (t.assigned_user_id === currentUser.id || currentUser.role === 'admin') && (
                            <button
                              onClick={() => handleCompleteTask(t.id)}
                              className="btn btn-outline btn-sm"
                              style={{ color: '#16a34a' }}
                            >
                              ✓ Mark Complete
                            </button>
                          )}
                          {t.status === 'completed' && (
                            <span style={{ color: '#16a34a', fontSize: '0.85rem', fontWeight: 600 }}>Completed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FULFILL & ALLOCATE INVENTORY MODAL */}
      {fulfillModalRequest && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '0.5rem' }}>Fulfill Request #{fulfillModalRequest.id}</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1rem' }}>
              <strong>{fulfillModalRequest.title}</strong> ({fulfillModalRequest.location || 'Location not specified'})
            </p>

            <form onSubmit={handleFulfillSubmit}>
              <div className="form-group">
                <label>Select Relief Supply to Allocate</label>
                <select
                  className="input"
                  value={fulfillItemId}
                  onChange={(e) => setFulfillItemId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">-- No stock deduction (mark fulfilled only) --</option>
                  {inventory.map((inv) => (
                    <option key={inv.id} value={inv.id} disabled={inv.quantity <= 0}>
                      {inv.item_name} ({inv.quantity} {inv.unit} in stock)
                    </option>
                  ))}
                </select>
              </div>

              {fulfillItemId !== '' && (
                <div className="form-group">
                  <label>Quantity to Allocate</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    required
                    value={fulfillQty}
                    onChange={(e) => setFulfillQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Dispatch Notes (Optional)</label>
                <input
                  className="input"
                  value={fulfillNotes}
                  onChange={(e) => setFulfillNotes(e.target.value)}
                  placeholder="e.g. Dispatched via emergency rescue boat #2"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setFulfillModalRequest(null)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm & Fulfill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
