"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { User, useAuth } from "../../../lib/auth-context";
import { ProtectedGuard } from "../../components/protected-guard";

type InviteResponse = {
  success?: boolean;
  inviteLink?: string;
  error?: string;
};

export default function TeamDashboard() {
  const { user } = useAuth();
  const [role, setRole] = useState("MANAGER");
  const [inviteLink, setInviteLink] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<"invite" | "create">("create");

  // Create User state
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("MANAGER");
  const [createMsg, setCreateMsg] = useState("");
  const [createError, setCreateError] = useState("");

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInviteLink("");

    try {
      const res = await api.post<InviteResponse>("/auth/invite", { role });
      if (res.error) {
        setError(res.error);
      } else if (res.inviteLink) {
        setInviteLink(res.inviteLink);
      }
    } catch (e: any) {
      setError("Failed to generate invite link");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setCreateError("");
    setCreateMsg("");

    try {
      const res = await api.post<{ success?: boolean; error?: string }>("/auth/create-user", {
        email: newEmail,
        name: newName,
        password: newPassword,
        role: newRole,
      });

      if (res.error) {
        setCreateError(res.error);
      } else if (res.success) {
        setCreateMsg("User created successfully!");
        setNewEmail("");
        setNewName("");
        setNewPassword("");
      }
    } catch (e: any) {
      setCreateError(e.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (user.role !== "ADMIN") {
    return (
      <div className="p-8 text-(--text-primary)">
        <h1 className="text-2xl font-bold">Team</h1>
        <p className="text-gray-400 mt-2">
          You do not have permission to manage the team. Only Admins can invite
          users.
        </p>
      </div>
    );
  }

  return (
    <ProtectedGuard requireAdmin={true}>
    <div className="p-8 text-(--text-primary) max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Manage Team</h1>
        <p className="text-gray-400 mt-2">
          Add employees to your company workspace directly or via invite link.
        </p>
      </div>

      <div className="flex border-b border-(--border) space-x-8">
        <button
          className={`pb-2 text-sm font-medium transition-colors ${activeTab === "create" ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-400 hover:text-white"}`}
          onClick={() => setActiveTab("create")}
        >
          Create Account
        </button>
        <button
          className={`pb-2 text-sm font-medium transition-colors ${activeTab === "invite" ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-400 hover:text-white"}`}
          onClick={() => setActiveTab("invite")}
        >
          Generate Invite Link
        </button>
      </div>

      {activeTab === "create" && (
        <div className="bg-(--bg-card) border border-(--border) rounded-xl p-6 shadow-md">
          <h2 className="text-xl font-semibold mb-4">Create New User</h2>
          <form onSubmit={handleCreateUser} className="space-y-4 max-w-sm">
            <div>
              <label className="block text-sm font-medium text-gray-300">Name</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-(--bg) border border-(--border) rounded-md focus:ring-blue-500 text-(--text-primary)" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Email</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-(--bg) border border-(--border) rounded-md focus:ring-blue-500 text-(--text-primary)" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-(--bg) border border-(--border) rounded-md focus:ring-blue-500 text-(--text-primary)" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Role</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-(--bg) border border-(--border) rounded-md text-(--text-primary)">
                <option value="ANALYST">Analyst (full ticket access)</option>
                <option value="MANAGER">Manager (can process tickets)</option>
                <option value="USER">User (read-only view)</option>
              </select>
            </div>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md w-full disabled:opacity-50 mt-4">
              {loading ? "Creating..." : "Create Account"}
            </button>
          </form>
          {createError && <p className="text-red-500 mt-4 text-sm">{createError}</p>}
          {createMsg && <p className="text-green-500 mt-4 text-sm font-medium">{createMsg}</p>}
        </div>
      )}

      {activeTab === "invite" && (
        <div className="bg-(--bg-card) border border-(--border) rounded-xl p-6 shadow-md">
        <h2 className="text-xl font-semibold mb-4">Create Invitation</h2>
        <form onSubmit={handleGenerateInvite} className="space-y-4">
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-300">
              Select Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 block max-w-xs w-full px-3 py-2 bg-(--bg) border border-(--border) rounded-md focus:ring-blue-500 focus:border-blue-500 text-(--text-primary)"
            >
              <option value="ANALYST">Analyst (full ticket access)</option>
              <option value="MANAGER">
                Manager (can process & view tickets)
              </option>
              <option value="USER">User (read-only view)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md disabled:bg-gray-600"
          >
            {loading ? "Generating..." : "Generate Link"}
          </button>
        </form>

        {error && <div className="text-red-500 mt-4 text-sm">{error}</div>}

        {inviteLink && (
          <div className="mt-6 p-4 border border-green-900/50 bg-green-900/20 rounded-md">
            <p className="text-green-400 font-medium mb-2">
              Invite link generated successfully!
            </p>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="flex-1 px-3 py-2 bg-(--bg) border border-(--border) rounded-md text-(--text-primary) text-sm focus:outline-none"
              />
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(inviteLink)}
                className="px-3 py-2 bg-(--border) hover:bg-(--bg) rounded-md text-sm font-medium text-(--text-primary) transition"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              This link can be used once and expires in 7 days.
            </p>
          </div>
        )}
        </div>
      )}
    </div>
    </ProtectedGuard>
  );
}
