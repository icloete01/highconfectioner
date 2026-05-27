const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, PencilLine, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';

function buildEditForm(user) {
  return {
    full_name: user.full_name || '',
    email: user.email || '',
    role: user.role || 'user',
    email_verified: user.email_verified === true,
    delivery_address: user.delivery_address || '',
  };
}

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState(buildEditForm({}));

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => db.entities.User.list(),
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id }) => db.entities.User.update(id, {
      email_verified: true,
      otp_code: null,
      otp_expires_at: null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success('User verified');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to verify user');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success('User updated');
      setEditingUser(null);
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update user');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.User.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success('User removed');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to remove user');
    },
  });

  const summary = useMemo(() => {
    const pending = users.filter((user) => user.email_verified !== true).length;
    const verified = users.length - pending;
    return { pending, verified };
  }, [users]);

  const openEditDialog = (user) => {
    setEditingUser(user);
    setEditForm(buildEditForm(user));
  };

  const closeEditDialog = () => {
    setEditingUser(null);
  };

  const handleSaveUser = () => {
    if (!editingUser) return;

    const payload = {};
    if (editForm.full_name !== (editingUser.full_name || '')) {
      payload.full_name = editForm.full_name;
    }
    if (editForm.email !== (editingUser.email || '')) {
      payload.email = editForm.email;
    }
    if (editForm.role !== (editingUser.role || 'user')) {
      payload.role = editForm.role;
    }
    if ((editForm.email_verified === true) !== (editingUser.email_verified === true)) {
      payload.email_verified = editForm.email_verified;
    }
    if (editForm.delivery_address !== (editingUser.delivery_address || '')) {
      payload.delivery_address = editForm.delivery_address;
    }

    if (Object.keys(payload).length === 0) {
      toast.info('No changes to save');
      return;
    }

    updateMutation.mutate({ id: editingUser.id, data: payload });
  };

  const handleDeleteUser = (user) => {
    if (user.id === currentUser?.id) {
      toast.error('You cannot remove your own account');
      return;
    }

    const confirmed = window.confirm(`Remove ${user.email || 'this user'}?`);
    if (!confirmed) return;

    deleteMutation.mutate(user.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Pending verification</p>
          <p className="mt-2 text-2xl font-semibold">{summary.pending}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Verified users</p>
          <p className="mt-2 text-2xl font-semibold">{summary.verified}</p>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <UserRound className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No users found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => {
            const isVerified = user.email_verified === true;
            return (
              <div key={user.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{user.full_name || 'Unnamed user'}</h3>
                      {isVerified ? (
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Verified</Badge>
                      ) : (
                        <Badge className="bg-amber-500/20 text-amber-200 border-amber-500/30">Pending</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
                    {user.delivery_address && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Address: {user.delivery_address}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Role: {user.role || 'user'} · Joined {new Date(user.created_date).toLocaleDateString('en-ZA')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <Badge variant="outline" className="gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {user.role || 'user'}
                    </Badge>
                    {!isVerified && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => verifyMutation.mutate({ id: user.id })}
                        disabled={verifyMutation.isPending}
                        className="gap-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Verify
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(user)}
                      className="gap-1"
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteUser(user)}
                      disabled={deleteMutation.isPending || user.id === currentUser?.id}
                      className="gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>
              Update the account details for this user and save your changes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-full-name">Full name</Label>
              <Input
                id="user-full-name"
                value={editForm.full_name}
                onChange={(event) => setEditForm((current) => ({ ...current, full_name: event.target.value }))}
                placeholder="Full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={editForm.email}
                onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-delivery-address">Delivery Address</Label>
              <Input
                id="user-delivery-address"
                value={editForm.delivery_address}
                onChange={(event) => setEditForm((current) => ({ ...current, delivery_address: event.target.value }))}
                placeholder="Enter delivery address"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="user-role">Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value) => setEditForm((current) => ({ ...current, role: value }))}
                >
                  <SelectTrigger id="user-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">user</SelectItem>
                    <SelectItem value="admin">admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-verified">Verification status</Label>
                <Select
                  value={editForm.email_verified ? 'verified' : 'pending'}
                  onValueChange={(value) => setEditForm((current) => ({ ...current, email_verified: value === 'verified' }))}
                >
                  <SelectTrigger id="user-verified">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
