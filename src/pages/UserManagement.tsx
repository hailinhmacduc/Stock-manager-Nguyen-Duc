import { useEffect, useState, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, Shield, Eye, Package, Move as MoveIcon, DollarSign, Trash2, User as UserIcon, AlertTriangle } from 'lucide-react';
import { User, PERMISSION_PRESETS, PermissionPresetKey, UserPermissions } from '@/lib/permissions';
import { useNavigate } from 'react-router-dom';

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const { permissions, user: currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form state
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [userPermissions, setUserPermissions] = useState<UserPermissions>({
    can_view_inventory: true,
    can_add_items: false,
    can_move_items: false,
    can_sell_items: false,
    is_full_access: false,
    is_admin: false
  });

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform data to match User interface
      const transformedUsers: User[] = (data || []).map(u => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name || '',
        role: u.role,
        is_active: u.is_active ?? true,
        can_view_inventory: u.can_view_inventory ?? true,
        can_add_items: u.can_add_items ?? false,
        can_move_items: u.can_move_items ?? false,
        can_sell_items: u.can_sell_items ?? false,
        is_full_access: u.is_full_access ?? false,
        is_admin: u.is_admin ?? false
      }));
      
      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: '❌ Lỗi',
        description: 'Không thể tải danh sách users',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!permissions.canManageUsers()) {
      toast({
        title: '⛔ Không Có Quyền',
        description: 'Bạn không có quyền truy cập trang này',
        variant: 'destructive'
      });
      navigate('/dashboard');
      return;
    }
    fetchUsers();
  }, [permissions, toast, navigate, fetchUsers]);

  const applyPreset = (presetKey: PermissionPresetKey) => {
    const preset = PERMISSION_PRESETS[presetKey];
    setUserPermissions(preset.permissions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingUser) {
        // Update existing user
        const { error } = await supabase
          .from('users')
          .update({
            full_name: fullName,
            can_view_inventory: userPermissions.can_view_inventory,
            can_add_items: userPermissions.can_add_items,
            can_move_items: userPermissions.can_move_items,
            can_sell_items: userPermissions.can_sell_items,
            is_full_access: userPermissions.is_full_access,
            is_admin: userPermissions.is_admin
          })
          .eq('id', editingUser.id);

        if (error) throw error;

        toast({
          title: '✅ Đã Cập Nhật',
          description: `Đã cập nhật quyền cho ${fullName}`
        });
      } else {
        // Create new user using Edge Function
        if (!email || !fullName || !password) {
          toast({
            title: '⚠️ Thiếu Thông Tin',
            description: 'Vui lòng điền đầy đủ email, họ tên và mật khẩu',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          toast({
            title: '⚠️ Email Không Hợp Lệ',
            description: 'Vui lòng nhập email đúng định dạng',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }

        // Validate password length
        if (password.length < 6) {
          toast({
            title: '⚠️ Mật Khẩu Quá Ngắn',
            description: 'Mật khẩu phải có ít nhất 6 ký tự',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }

        const { data, error: functionError } = await supabase.functions.invoke('create-user', {
          body: {
            email,
            password,
            full_name: fullName,
            permissions: userPermissions
          }
        });

        if (functionError) {
          toast({
            title: '❌ Lỗi',
            description: functionError.message || 'Không thể tạo user mới',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }

        if (data?.error) {
          toast({
            title: '❌ Lỗi',
            description: data.error,
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }

        toast({
          title: '✅ Thành Công',
          description: `Đã tạo user mới: ${fullName}`
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast({
        title: '❌ Lỗi',
        description: error instanceof Error ? error.message : 'Không thể lưu user',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEmail(user.email);
    setFullName(user.full_name || '');
    setUserPermissions({
      can_view_inventory: user.can_view_inventory,
      can_add_items: user.can_add_items,
      can_move_items: user.can_move_items,
      can_sell_items: user.can_sell_items,
      is_full_access: user.is_full_access,
      is_admin: user.is_admin
    });
    setDialogOpen(true);
  };

  const toggleActive = async (user: User) => {
    if (user.id === currentUser?.id) {
      toast({
        title: '⚠️ Cảnh Báo',
        description: 'Bạn không thể tự vô hiệu hóa tài khoản của mình',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: '✅ Thành Công',
        description: `Đã ${!user.is_active ? 'kích hoạt' : 'vô hiệu hóa'} tài khoản`
      });

      fetchUsers();
    } catch (error) {
      toast({
        title: '❌ Lỗi',
        description: 'Không thể cập nhật trạng thái',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    if (userToDelete.id === currentUser?.id) {
      toast({
        title: '⚠️ Cảnh Báo',
        description: 'Bạn không thể xóa tài khoản của chính mình',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: userToDelete.id }
      });

      if (error) {
        toast({
          title: '❌ Lỗi',
          description: error.message || 'Không thể xóa user',
          variant: 'destructive'
        });
        return;
      }

      if (data?.error) {
        toast({
          title: '❌ Lỗi',
          description: data.error,
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: '✅ Thành Công',
        description: data?.message || 'Đã xóa user thành công'
      });

      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      toast({
        title: '❌ Lỗi',
        description: 'Không thể xóa user',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = (user: User) => {
    setViewingUser(user);
    setEmail(user.email);
    setFullName(user.full_name || '');
    setUserPermissions({
      can_view_inventory: user.can_view_inventory,
      can_add_items: user.can_add_items,
      can_move_items: user.can_move_items,
      can_sell_items: user.can_sell_items,
      is_full_access: user.is_full_access,
      is_admin: user.is_admin
    });
    setProfileDialogOpen(true);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingUser) return;

    setLoading(true);
    try {
      const updateData: Partial<User> = {
        full_name: fullName,
        can_view_inventory: userPermissions.can_view_inventory,
        can_add_items: userPermissions.can_add_items,
        can_move_items: userPermissions.can_move_items,
        can_sell_items: userPermissions.can_sell_items,
        is_full_access: userPermissions.is_full_access,
        is_admin: userPermissions.is_admin
      };

      // If password is provided, update it too
      if (password.trim()) {
        if (password.length < 6) {
          toast({
            title: '⚠️ Mật Khẩu Quá Ngắn',
            description: 'Mật khẩu phải có ít nhất 6 ký tự',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }

        // Use update-password function to update password with proper bcrypt hash
        const { data: passwordData, error: passwordError } = await supabase.functions.invoke('update-password', {
          body: { email: viewingUser.email, newPassword: password }
        });

        if (passwordError || passwordData?.error) {
          toast({
            title: '❌ Lỗi',
            description: passwordError?.message || passwordData?.error || 'Không thể cập nhật mật khẩu',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', viewingUser.id);

      if (error) throw error;

      toast({
        title: '✅ Đã Cập Nhật',
        description: `Đã cập nhật thông tin cho ${fullName}`
      });

      setProfileDialogOpen(false);
      setViewingUser(null);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast({
        title: '❌ Lỗi',
        description: error instanceof Error ? error.message : 'Không thể cập nhật thông tin',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setViewingUser(null);
    setEmail('');
    setFullName('');
    setPassword('');
    setUserPermissions({
      can_view_inventory: true,
      can_add_items: false,
      can_move_items: false,
      can_sell_items: false,
      is_full_access: false,
      is_admin: false
    });
  };

  const getUserBadges = (user: User) => {
    const badges = [];
    if (user.is_admin) badges.push({ label: 'Admin', color: 'bg-gray-900 text-white' });
    else if (user.is_full_access) badges.push({ label: 'Toàn Quyền', color: 'bg-red-100 text-red-800' });
    else {
      if (user.can_view_inventory) badges.push({ label: 'Xem', color: 'bg-blue-100 text-blue-800' });
      if (user.can_add_items) badges.push({ label: 'Nhập', color: 'bg-green-100 text-green-800' });
      if (user.can_move_items) badges.push({ label: 'Luân Chuyển', color: 'bg-purple-100 text-purple-800' });
      if (user.can_sell_items) badges.push({ label: 'Bán', color: 'bg-orange-100 text-orange-800' });
    }
    return badges;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Quản Lý Users
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Quản lý người dùng và phân quyền
            </p>
          </div>
          <Button 
            onClick={() => { resetForm(); setDialogOpen(true); }} 
            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 w-full sm:w-auto"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Thêm User Mới</span>
            <span className="sm:hidden">Thêm User</span>
          </Button>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Danh Sách Users ({users.length} người)</CardTitle>
            <CardDescription>
              Click vào user để chỉnh sửa quyền
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`p-3 md:p-4 border rounded-lg transition-all hover:shadow-md ${
                    !user.is_active ? 'bg-gray-50 opacity-60' : 'bg-white'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <button
                          onClick={() => handleViewProfile(user)}
                          className="font-semibold text-base md:text-lg text-blue-600 hover:text-blue-800 hover:underline transition-colors text-left"
                        >
                          {user.full_name || user.email}
                        </button>
                        {!user.is_active && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 w-fit">
                            Đã Vô Hiệu Hóa
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{user.email}</p>
                      <div className="flex gap-1 md:gap-2 mt-2 flex-wrap">
                        {getUserBadges(user).map((badge, idx) => (
                          <Badge key={idx} className={`${badge.color} text-xs`}>
                            {badge.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {/* Mobile Actions */}
                    <div className="flex flex-col sm:flex-row gap-2 md:hidden">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(user)}
                        className="w-full sm:w-auto text-xs"
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        Phân Quyền
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActive(user)}
                          disabled={user.id === currentUser?.id}
                          className="flex-1 text-xs"
                        >
                          {user.is_active ? 'Vô Hiệu Hóa' : 'Kích Hoạt'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUserToDelete(user);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={user.id === currentUser?.id}
                          className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Xóa
                        </Button>
                      </div>
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(user)}
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        Phân Quyền
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActive(user)}
                        disabled={user.id === currentUser?.id}
                      >
                        {user.is_active ? 'Vô Hiệu Hóa' : 'Kích Hoạt'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setUserToDelete(user);
                          setDeleteDialogOpen(true);
                        }}
                        disabled={user.id === currentUser?.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Xóa
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                {editingUser ? (
                  <>
                    <Shield className="h-5 w-5 text-blue-600" />
                    Chỉnh Sửa Quyền User
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5 text-green-600" />
                    Tạo User Mới
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {editingUser 
                  ? 'Cập nhật quyền cho user hiện tại' 
                  : 'Tạo tài khoản mới và phân quyền cho user'
                }
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Preset Buttons */}
              <div className="space-y-2">
                <Label className="font-semibold">Chọn Nhanh (Preset)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(PERMISSION_PRESETS).map(([key, preset]) => (
                    <Button
                      key={key}
                      type="button"
                      variant="outline"
                      onClick={() => applyPreset(key as PermissionPresetKey)}
                      className="text-left justify-start h-auto py-3"
                    >
                      <div>
                        <div className="font-semibold">{preset.name}</div>
                        <div className="text-xs text-slate-500">{preset.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* User Info */}
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                <div className="space-y-2">
                  <Label>Email {!editingUser && <span className="text-red-500">*</span>}</Label>
                  <Input 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!!editingUser} 
                    className="bg-white" 
                    placeholder="user@example.com"
                    required={!editingUser}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Họ Tên {!editingUser && <span className="text-red-500">*</span>}</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Họ và tên đầy đủ"
                    required={!editingUser}
                  />
                </div>
                {!editingUser && (
                  <div className="space-y-2">
                    <Label>Mật Khẩu <span className="text-red-500">*</span></Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mật khẩu cho user mới"
                      required
                    />
                    <p className="text-xs text-slate-500">
                      Tối thiểu 6 ký tự. User có thể đổi mật khẩu sau khi đăng nhập.
                    </p>
                  </div>
                )}
              </div>

              {/* Permissions */}
              <div className="space-y-4">
                <Label className="font-semibold text-base">Chi Tiết Quyền</Label>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Eye className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Xem Kho Hàng</p>
                        <p className="text-xs text-slate-500">Xem danh sách tồn kho</p>
                      </div>
                    </div>
                    <Switch
                      checked={userPermissions.can_view_inventory}
                      onCheckedChange={(checked) =>
                        setUserPermissions({ ...userPermissions, can_view_inventory: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Nhập Hàng</p>
                        <p className="text-xs text-slate-500">Thêm sản phẩm (không xóa được)</p>
                      </div>
                    </div>
                    <Switch
                      checked={userPermissions.can_add_items}
                      onCheckedChange={(checked) =>
                        setUserPermissions({ ...userPermissions, can_add_items: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <MoveIcon className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="font-medium">Luân Chuyển</p>
                        <p className="text-xs text-slate-500">Di chuyển hàng giữa các kho</p>
                      </div>
                    </div>
                    <Switch
                      checked={userPermissions.can_move_items}
                      onCheckedChange={(checked) =>
                        setUserPermissions({ ...userPermissions, can_move_items: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="font-medium">Bán Hàng</p>
                        <p className="text-xs text-slate-500">Đánh dấu sản phẩm đã bán</p>
                      </div>
                    </div>
                    <Switch
                      checked={userPermissions.can_sell_items}
                      onCheckedChange={(checked) =>
                        setUserPermissions({ ...userPermissions, can_sell_items: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border-2 border-red-200 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-medium text-red-900">Toàn Quyền</p>
                        <p className="text-xs text-red-700">Tất cả quyền trừ quản lý users</p>
                      </div>
                    </div>
                    <Switch
                      checked={userPermissions.is_full_access}
                      onCheckedChange={(checked) =>
                        setUserPermissions({ ...userPermissions, is_full_access: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border-2 border-gray-300 bg-gray-900 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-white" />
                      <div>
                        <p className="font-medium text-white">Admin</p>
                        <p className="text-xs text-gray-300">Toàn bộ quyền bao gồm quản lý users</p>
                      </div>
                    </div>
                    <Switch
                      checked={userPermissions.is_admin}
                      onCheckedChange={(checked) =>
                        setUserPermissions({ ...userPermissions, is_admin: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDialogOpen(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang Lưu...
                    </>
                  ) : (
                    'Lưu Thay Đổi'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* User Profile View/Edit Dialog */}
        <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-blue-600" />
                Thông Tin User: {viewingUser?.full_name || viewingUser?.email}
              </DialogTitle>
              <DialogDescription>
                Xem và chỉnh sửa thông tin, mật khẩu và quyền của user
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              {/* Preset Buttons */}
              <div className="space-y-2">
                <Label className="font-semibold">Chọn Nhanh (Preset)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(PERMISSION_PRESETS).map(([key, preset]) => (
                    <Button
                      key={key}
                      type="button"
                      variant="outline"
                      onClick={() => applyPreset(key as PermissionPresetKey)}
                      className="text-left justify-start h-auto py-3"
                    >
                      <div>
                        <div className="font-semibold">{preset.name}</div>
                        <div className="text-xs text-slate-500">{preset.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* User Info */}
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    value={email} 
                    disabled 
                    className="bg-gray-100" 
                  />
                  <p className="text-xs text-slate-500">Email không thể thay đổi</p>
                </div>
                <div className="space-y-2">
                  <Label>Họ Tên</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Họ và tên đầy đủ"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mật Khẩu Mới (Tùy chọn)</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Để trống nếu không muốn đổi mật khẩu"
                  />
                  <p className="text-xs text-slate-500">
                    Chỉ nhập nếu muốn thay đổi mật khẩu. Tối thiểu 6 ký tự.
                  </p>
                </div>
              </div>

              {/* Permissions */}
              <div className="space-y-4">
                <Label className="font-semibold text-base">Chi Tiết Quyền</Label>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Eye className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Xem Kho Hàng</p>
                        <p className="text-xs text-slate-500">Xem danh sách tồn kho</p>
                      </div>
                    </div>
                    <Switch
                      checked={userPermissions.can_view_inventory}
                      onCheckedChange={(checked) =>
                        setUserPermissions({ ...userPermissions, can_view_inventory: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Nhập Hàng</p>
                        <p className="text-xs text-slate-500">Thêm sản phẩm (không xóa được)</p>
                      </div>
                    </div>
                    <Switch
                      checked={userPermissions.can_add_items}
                      onCheckedChange={(checked) =>
                        setUserPermissions({ ...userPermissions, can_add_items: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <MoveIcon className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="font-medium">Luân Chuyển</p>
                        <p className="text-xs text-slate-500">Di chuyển hàng giữa các kho</p>
                      </div>
                    </div>
                    <Switch
                      checked={userPermissions.can_move_items}
                      onCheckedChange={(checked) =>
                        setUserPermissions({ ...userPermissions, can_move_items: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="font-medium">Bán Hàng</p>
                        <p className="text-xs text-slate-500">Đánh dấu sản phẩm đã bán</p>
                      </div>
                    </div>
                    <Switch
                      checked={userPermissions.can_sell_items}
                      onCheckedChange={(checked) =>
                        setUserPermissions({ ...userPermissions, can_sell_items: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border-2 border-red-200 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-medium text-red-900">Toàn Quyền</p>
                        <p className="text-xs text-red-700">Tất cả quyền trừ quản lý users</p>
                      </div>
                    </div>
                    <Switch
                      checked={userPermissions.is_full_access}
                      onCheckedChange={(checked) =>
                        setUserPermissions({ ...userPermissions, is_full_access: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border-2 border-gray-300 bg-gray-900 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-white" />
                      <div>
                        <p className="font-medium text-white">Admin</p>
                        <p className="text-xs text-gray-300">Toàn bộ quyền bao gồm quản lý users</p>
                      </div>
                    </div>
                    <Switch
                      checked={userPermissions.is_admin}
                      onCheckedChange={(checked) =>
                        setUserPermissions({ ...userPermissions, is_admin: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setProfileDialogOpen(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang Cập Nhật...
                    </>
                  ) : (
                    'Cập Nhật Thông Tin'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete User Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Xác Nhận Xóa User
              </DialogTitle>
              <DialogDescription>
                Hành động này không thể hoàn tác. User sẽ bị xóa vĩnh viễn khỏi hệ thống.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-semibold text-red-900">
                  {userToDelete?.full_name || userToDelete?.email}
                </p>
                <p className="text-sm text-red-700">{userToDelete?.email}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDeleteUser}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang Xóa...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Xóa User
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default UserManagement;

