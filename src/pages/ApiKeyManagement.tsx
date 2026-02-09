import { useEffect, useState, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import {
    Loader2, Plus, Key, Copy, Check, Eye, EyeOff, Trash2, Shield, BookOpen,
    Clock, AlertTriangle, ExternalLink, RefreshCw
} from 'lucide-react';

interface ApiKey {
    id: string;
    key_prefix: string;
    name: string;
    permission: 'read' | 'full';
    description: string | null;
    is_active: boolean;
    created_at: string;
    last_used_at: string | null;
    expires_at: string | null;
}

const SUPABASE_URL = 'https://ewzntoebiavqojdesfip.supabase.co';

const ApiKeyManagement = () => {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [docsDialogOpen, setDocsDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null);
    const [newKeyResult, setNewKeyResult] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [creating, setCreating] = useState(false);
    const [docsCopied, setDocsCopied] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'curl' | 'javascript' | 'python' | 'n8n'>('curl');

    // Form state
    const [keyName, setKeyName] = useState('');
    const [keyPermission, setKeyPermission] = useState<'read' | 'full'>('read');
    const [keyDescription, setKeyDescription] = useState('');

    const { permissions } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const fetchApiKeys = useCallback(async () => {
        try {
            const { data, error } = await supabase.functions.invoke('api-manage', { method: 'GET' });
            if (error) throw error;
            if (data?.data) setApiKeys(data.data);
        } catch (error) {
            console.error('Error fetching API keys:', error);
            toast({
                title: '❌ Lỗi',
                description: 'Không thể tải danh sách API keys',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (!permissions.isAdmin()) {
            toast({
                title: '⛔ Không Có Quyền',
                description: 'Chỉ Admin mới có thể quản lý API Keys',
                variant: 'destructive'
            });
            navigate('/dashboard');
            return;
        }
        fetchApiKeys();
    }, [permissions, toast, navigate, fetchApiKeys]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!keyName.trim()) return;

        setCreating(true);
        try {
            const { data, error } = await supabase.functions.invoke('api-manage', {
                method: 'POST',
                body: {
                    name: keyName,
                    permission: keyPermission,
                    description: keyDescription || null
                }
            });

            if (error) throw error;

            if (data?.api_key) {
                setNewKeyResult(data.api_key);
                toast({
                    title: '✅ Tạo API Key Thành Công',
                    description: 'Hãy sao chép key ngay – key sẽ không được hiển thị lại!'
                });
                fetchApiKeys();
            } else if (data?.error) {
                throw new Error(data.error);
            }
        } catch (error) {
            toast({
                title: '❌ Lỗi',
                description: error instanceof Error ? error.message : 'Không thể tạo API key',
                variant: 'destructive'
            });
        } finally {
            setCreating(false);
        }
    };

    const handleToggleActive = async (key: ApiKey) => {
        try {
            const { data, error } = await supabase.functions.invoke('api-manage', {
                method: 'PUT',
                body: { id: key.id, is_active: !key.is_active }
            });

            if (error) throw error;

            toast({
                title: '✅ Cập Nhật',
                description: `${key.name} đã được ${!key.is_active ? 'kích hoạt' : 'vô hiệu hóa'}`
            });
            fetchApiKeys();
        } catch (error) {
            toast({
                title: '❌ Lỗi',
                description: 'Không thể cập nhật trạng thái',
                variant: 'destructive'
            });
        }
    };

    const handleDelete = async () => {
        if (!keyToDelete) return;

        try {
            const { error } = await supabase.functions.invoke('api-manage', {
                method: 'DELETE',
                body: { id: keyToDelete.id }
            });

            if (error) throw error;

            toast({
                title: '✅ Đã Xóa',
                description: `API key "${keyToDelete.name}" đã được xóa`
            });
            setDeleteDialogOpen(false);
            setKeyToDelete(null);
            fetchApiKeys();
        } catch (error) {
            toast({
                title: '❌ Lỗi',
                description: 'Không thể xóa API key',
                variant: 'destructive'
            });
        }
    };

    const copyToClipboard = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const resetCreateForm = () => {
        setKeyName('');
        setKeyPermission('read');
        setKeyDescription('');
        setNewKeyResult(null);
        setCopied(false);
    };

    const copyDocsSnippet = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text);
        setDocsCopied(id);
        setTimeout(() => setDocsCopied(null), 2000);
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-4 animate-fade-in">
                {/* Header */}
                <div className="page-header flex items-start justify-between">
                    <div>
                        <h1>
                            <Key className="h-5 w-5 md:h-6 md:w-6 text-amber-600" />
                            Quản Lý API Keys
                        </h1>
                        <p>Tạo và quản lý API key cho phần mềm bên thứ 3</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => setDocsDialogOpen(true)}
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs md:text-sm h-8 md:h-9 px-3"
                        >
                            <BookOpen className="h-4 w-4" />
                            <span className="hidden sm:inline">Tài Liệu API</span>
                            <span className="sm:hidden">Docs</span>
                        </Button>
                        <Button
                            onClick={() => { resetCreateForm(); setCreateDialogOpen(true); }}
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 text-xs md:text-sm h-8 md:h-9 px-3"
                        >
                            <Plus className="h-4 w-4" />
                            <span className="hidden sm:inline">Tạo API Key</span>
                            <span className="sm:hidden">Tạo</span>
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="section-card p-3 text-center">
                        <p className="text-2xl font-bold text-slate-900">{apiKeys.length}</p>
                        <p className="text-xs text-slate-500">Tổng API Keys</p>
                    </div>
                    <div className="section-card p-3 text-center">
                        <p className="text-2xl font-bold text-green-600">
                            {apiKeys.filter(k => k.is_active).length}
                        </p>
                        <p className="text-xs text-slate-500">Đang Hoạt Động</p>
                    </div>
                    <div className="section-card p-3 text-center">
                        <p className="text-2xl font-bold text-red-500">
                            {apiKeys.filter(k => !k.is_active).length}
                        </p>
                        <p className="text-xs text-slate-500">Đã Vô Hiệu</p>
                    </div>
                </div>

                {/* API Keys List */}
                <div className="section-card">
                    <div className="section-card-header justify-between">
                        <div className="flex items-center gap-2">
                            <h3>Danh Sách API Keys</h3>
                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                {apiKeys.length}
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setLoading(true); fetchApiKeys(); }}
                            className="text-slate-500 hover:text-slate-700"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>

                    {apiKeys.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <Key className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">Chưa có API key nào</p>
                            <p className="text-sm">Tạo API key đầu tiên để bắt đầu</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {apiKeys.map((key) => (
                                <div
                                    key={key.id}
                                    className={`px-4 py-3.5 transition-colors ${!key.is_active ? 'opacity-50 bg-slate-50/50' : 'hover:bg-slate-50'}`}
                                >
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-slate-900">{key.name}</span>
                                                <Badge className={
                                                    key.permission === 'full'
                                                        ? 'bg-red-100 text-red-800 text-xs'
                                                        : 'bg-blue-100 text-blue-800 text-xs'
                                                }>
                                                    {key.permission === 'full' ? '🔓 Full Access' : '👁️ Read Only'}
                                                </Badge>
                                                {!key.is_active && (
                                                    <Badge variant="outline" className="bg-red-50 text-red-700 text-xs">
                                                        Vô Hiệu
                                                    </Badge>
                                                )}
                                            </div>

                                            {key.description && (
                                                <p className="text-sm text-slate-500 mt-1">{key.description}</p>
                                            )}

                                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                                                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                                    {key.key_prefix}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    Tạo: {formatDate(key.created_at)}
                                                </span>
                                                {key.last_used_at && (
                                                    <span className="flex items-center gap-1">
                                                        <RefreshCw className="h-3 w-3" />
                                                        Dùng: {formatDate(key.last_used_at)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <div className="flex items-center gap-2 mr-2">
                                                <span className="text-xs text-slate-500">
                                                    {key.is_active ? 'Bật' : 'Tắt'}
                                                </span>
                                                <Switch
                                                    checked={key.is_active}
                                                    onCheckedChange={() => handleToggleActive(key)}
                                                />
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setKeyToDelete(key);
                                                    setDeleteDialogOpen(true);
                                                }}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Hướng Dẫn Gọi API - Inline Guide */}
                <div className="section-card">
                    <div className="section-card-header">
                        <h3>
                            <BookOpen className="h-4 w-4 text-blue-600" />
                            Hướng Dẫn Gọi API
                        </h3>
                    </div>

                    <div className="p-4 space-y-5">
                        {/* Quick Start */}
                        <div>
                            <h4 className="font-semibold text-slate-900 mb-3 text-sm flex items-center gap-2">
                                🚀 Bắt Đầu Nhanh
                            </h4>
                            <div className="space-y-2">
                                {[
                                    { step: '1', title: 'Tạo API Key', desc: 'Nhấn "Tạo API Key" ở trên, chọn quyền Read hoặc Full' },
                                    { step: '2', title: 'Sao chép Key', desc: 'Copy key ngay sau khi tạo — key chỉ hiển thị 1 lần duy nhất' },
                                    { step: '3', title: 'Gọi API', desc: 'Đặt key vào header Authorization: Bearer YOUR_KEY' },
                                ].map((s) => (
                                    <div key={s.step} className="flex gap-3 items-start">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                                            {s.step}
                                        </span>
                                        <div>
                                            <span className="font-medium text-slate-800 text-sm">{s.title}</span>
                                            <p className="text-xs text-slate-500">{s.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        {/* Base URL */}
                        <div>
                            <h4 className="font-semibold text-slate-900 mb-2 text-sm">🔗 Base URL</h4>
                            <div className="relative">
                                <div className="bg-slate-900 text-green-400 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                                    {SUPABASE_URL}/functions/v1/api
                                </div>
                                <button
                                    onClick={() => copyDocsSnippet(`${SUPABASE_URL}/functions/v1/api`, 'baseurl')}
                                    className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors"
                                >
                                    {docsCopied === 'baseurl' ? (
                                        <Check className="h-3 w-3 text-green-400" />
                                    ) : (
                                        <Copy className="h-3 w-3 text-slate-300" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        {/* Code Examples with Tabs */}
                        <div>
                            <h4 className="font-semibold text-slate-900 mb-3 text-sm">💻 Ví Dụ Gọi API</h4>

                            {/* Tab buttons */}
                            <div className="flex gap-1 mb-3 bg-slate-100 rounded-lg p-1">
                                {[
                                    { id: 'curl' as const, label: 'cURL' },
                                    { id: 'javascript' as const, label: 'JavaScript' },
                                    { id: 'python' as const, label: 'Python' },
                                    { id: 'n8n' as const, label: 'N8N' },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-all ${activeTab === tab.id
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Tab content */}
                            {activeTab === 'curl' && (
                                <div className="space-y-3">
                                    <div className="relative">
                                        <p className="text-xs text-slate-500 mb-1">📦 Lấy danh sách tồn kho:</p>
                                        <div className="bg-slate-900 text-green-400 rounded-lg p-3 font-mono text-xs overflow-x-auto whitespace-pre">
                                            {`curl -X GET \\
  "${SUPABASE_URL}/functions/v1/api/inventory" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                                        </div>
                                        <button
                                            onClick={() => copyDocsSnippet(`curl -X GET \\\n  "${SUPABASE_URL}/functions/v1/api/inventory" \\\n  -H "Authorization: Bearer YOUR_API_KEY"`, 'curl1')}
                                            className="absolute top-7 right-2 p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors"
                                        >
                                            {docsCopied === 'curl1' ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3 text-slate-300" />}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <p className="text-xs text-slate-500 mb-1">🔍 Lọc hàng theo vị trí + tình trạng:</p>
                                        <div className="bg-slate-900 text-green-400 rounded-lg p-3 font-mono text-xs overflow-x-auto whitespace-pre">
                                            {`curl -X GET \\
  "${SUPABASE_URL}/functions/v1/api/inventory?location=Kho%20T3&condition=NEW_SEAL&limit=50" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                                        </div>
                                        <button
                                            onClick={() => copyDocsSnippet(`curl -X GET \\\n  "${SUPABASE_URL}/functions/v1/api/inventory?location=Kho%20T3&condition=NEW_SEAL&limit=50" \\\n  -H "Authorization: Bearer YOUR_API_KEY"`, 'curl2')}
                                            className="absolute top-7 right-2 p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors"
                                        >
                                            {docsCopied === 'curl2' ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3 text-slate-300" />}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <p className="text-xs text-slate-500 mb-1">📊 Xem thống kê tổng quan:</p>
                                        <div className="bg-slate-900 text-green-400 rounded-lg p-3 font-mono text-xs overflow-x-auto whitespace-pre">
                                            {`curl -X GET \\
  "${SUPABASE_URL}/functions/v1/api/stats" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                                        </div>
                                        <button
                                            onClick={() => copyDocsSnippet(`curl -X GET \\\n  "${SUPABASE_URL}/functions/v1/api/stats" \\\n  -H "Authorization: Bearer YOUR_API_KEY"`, 'curl3')}
                                            className="absolute top-7 right-2 p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors"
                                        >
                                            {docsCopied === 'curl3' ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3 text-slate-300" />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'javascript' && (
                                <div className="space-y-3">
                                    <div className="relative">
                                        <p className="text-xs text-slate-500 mb-1">📦 Fetch danh sách tồn kho:</p>
                                        <div className="bg-slate-900 text-green-400 rounded-lg p-3 font-mono text-xs overflow-x-auto whitespace-pre">
                                            {`const API_URL = "${SUPABASE_URL}/functions/v1/api";
const API_KEY = "YOUR_API_KEY";

// Lấy danh sách tồn kho
const response = await fetch(\`\${API_URL}/inventory\`, {
  headers: {
    "Authorization": \`Bearer \${API_KEY}\`
  }
});
const data = await response.json();
console.log(data);`}
                                        </div>
                                        <button
                                            onClick={() => copyDocsSnippet(`const API_URL = "${SUPABASE_URL}/functions/v1/api";\nconst API_KEY = "YOUR_API_KEY";\n\nconst response = await fetch(\`\${API_URL}/inventory\`, {\n  headers: {\n    "Authorization": \`Bearer \${API_KEY}\`\n  }\n});\nconst data = await response.json();\nconsole.log(data);`, 'js1')}
                                            className="absolute top-7 right-2 p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors"
                                        >
                                            {docsCopied === 'js1' ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3 text-slate-300" />}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <p className="text-xs text-slate-500 mb-1">✏️ Cập nhật sản phẩm (cần Full Access):</p>
                                        <div className="bg-slate-900 text-green-400 rounded-lg p-3 font-mono text-xs overflow-x-auto whitespace-pre">
                                            {`// Cập nhật vị trí sản phẩm
const res = await fetch(\`\${API_URL}/inventory/SERIAL123\`, {
  method: "PUT",
  headers: {
    "Authorization": \`Bearer \${API_KEY}\`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    location: "Kho T3",
    condition: "NEW_SEAL"
  })
});`}
                                        </div>
                                        <button
                                            onClick={() => copyDocsSnippet(`const res = await fetch(\`\${API_URL}/inventory/SERIAL123\`, {\n  method: "PUT",\n  headers: {\n    "Authorization": \`Bearer \${API_KEY}\`,\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    location: "Kho T3",\n    condition: "NEW_SEAL"\n  })\n});`, 'js2')}
                                            className="absolute top-7 right-2 p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors"
                                        >
                                            {docsCopied === 'js2' ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3 text-slate-300" />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'python' && (
                                <div className="space-y-3">
                                    <div className="relative">
                                        <p className="text-xs text-slate-500 mb-1">📦 Requests — Lấy tồn kho:</p>
                                        <div className="bg-slate-900 text-green-400 rounded-lg p-3 font-mono text-xs overflow-x-auto whitespace-pre">
                                            {`import requests

API_URL = "${SUPABASE_URL}/functions/v1/api"
API_KEY = "YOUR_API_KEY"
headers = {"Authorization": f"Bearer {API_KEY}"}

# Lấy danh sách tồn kho
res = requests.get(f"{API_URL}/inventory", headers=headers)
data = res.json()
print(data)

# Lọc theo vị trí
res = requests.get(
    f"{API_URL}/inventory",
    headers=headers,
    params={"location": "Kho T3", "status": "AVAILABLE"}
)
print(res.json())`}
                                        </div>
                                        <button
                                            onClick={() => copyDocsSnippet(`import requests\n\nAPI_URL = "${SUPABASE_URL}/functions/v1/api"\nAPI_KEY = "YOUR_API_KEY"\nheaders = {"Authorization": f"Bearer {API_KEY}"}\n\nres = requests.get(f"{API_URL}/inventory", headers=headers)\ndata = res.json()\nprint(data)`, 'py1')}
                                            className="absolute top-7 right-2 p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors"
                                        >
                                            {docsCopied === 'py1' ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3 text-slate-300" />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'n8n' && (
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-2">Cấu hình node HTTP Request trong N8N:</p>
                                        <div className="bg-slate-50 rounded-lg p-3 border space-y-2">
                                            {[
                                                { label: 'Method', value: 'GET' },
                                                { label: 'URL', value: `${SUPABASE_URL}/functions/v1/api/inventory` },
                                                { label: 'Authentication', value: 'Generic Credential Type → Header Auth' },
                                                { label: 'Header Name', value: 'Authorization' },
                                                { label: 'Header Value', value: 'Bearer YOUR_API_KEY' },
                                            ].map((item, i) => (
                                                <div key={i} className="flex items-start gap-2 text-xs">
                                                    <span className="font-semibold text-slate-700 min-w-[110px]">{item.label}:</span>
                                                    <code className="text-blue-700 bg-white px-1.5 py-0.5 rounded border break-all">{item.value}</code>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <p className="text-xs text-blue-800">
                                            <strong>💡 Mẹo:</strong> Trong N8N, dùng <strong>Header Auth</strong> với Name = <code className="bg-white px-1 rounded">Authorization</code> và Value = <code className="bg-white px-1 rounded">Bearer sk_read_xxx...</code>.
                                            Đừng quên chữ "Bearer " ở đầu (có dấu cách).
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <hr className="border-slate-100" />

                        {/* Response Format */}
                        <div>
                            <h4 className="font-semibold text-slate-900 mb-2 text-sm">📄 Response Format</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs text-green-600 font-semibold mb-1">✅ Thành công:</p>
                                    <div className="bg-slate-900 text-green-400 rounded-lg p-3 font-mono text-xs overflow-x-auto whitespace-pre">
                                        {`{
  "success": true,
  "data": [...],
  "count": 150,
  "limit": 100,
  "offset": 0
}`}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-red-600 font-semibold mb-1">❌ Lỗi:</p>
                                    <div className="bg-slate-900 text-red-400 rounded-lg p-3 font-mono text-xs overflow-x-auto whitespace-pre">
                                        {`{
  "success": false,
  "error": "Mô tả lỗi"
}

// HTTP Status Codes:
// 401 - Thiếu hoặc sai API key
// 403 - Không đủ quyền (read key gọi write)
// 404 - Không tìm thấy
// 500 - Lỗi server`}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        {/* Endpoints Reference */}
                        <div>
                            <h4 className="font-semibold text-slate-900 mb-2 text-sm">📋 Danh Sách Endpoints</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="text-left py-2 px-2 text-slate-600 font-semibold">Method</th>
                                            <th className="text-left py-2 px-2 text-slate-600 font-semibold">Endpoint</th>
                                            <th className="text-left py-2 px-2 text-slate-600 font-semibold hidden sm:table-cell">Mô tả</th>
                                            <th className="text-left py-2 px-2 text-slate-600 font-semibold">Quyền</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {[
                                            { method: 'GET', path: '/inventory', desc: 'Danh sách hàng tồn kho', perm: 'read' },
                                            { method: 'GET', path: '/inventory/:serial', desc: 'Chi tiết 1 sản phẩm', perm: 'read' },
                                            { method: 'GET', path: '/sku', desc: 'Tất cả mã SKU + quantity', perm: 'read' },
                                            { method: 'GET', path: '/sku/:sku_id', desc: 'Chi tiết SKU + items', perm: 'read' },
                                            { method: 'GET', path: '/locations', desc: 'Vị trí kho + breakdown', perm: 'read' },
                                            { method: 'GET', path: '/stats', desc: 'Thống kê tổng quan', perm: 'read' },
                                            { method: 'GET', path: '/sales', desc: 'Dữ liệu bán hàng', perm: 'read' },
                                            { method: 'GET', path: '/products', desc: 'Sản phẩm đã bán', perm: 'read' },
                                            { method: 'GET', path: '/staff', desc: 'Nhân viên', perm: 'read' },
                                            { method: 'POST', path: '/inventory', desc: 'Thêm sản phẩm mới', perm: 'full' },
                                            { method: 'PUT', path: '/inventory/:serial', desc: 'Cập nhật sản phẩm', perm: 'full' },
                                            { method: 'DELETE', path: '/inventory/:serial', desc: 'Xóa (đánh dấu SOLD)', perm: 'full' },
                                        ].map((ep, i) => (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className="py-1.5 px-2">
                                                    <Badge className={`text-xs font-mono ${ep.method === 'GET' ? 'bg-green-100 text-green-800' :
                                                            ep.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                                                                ep.method === 'PUT' ? 'bg-amber-100 text-amber-800' :
                                                                    'bg-red-100 text-red-800'
                                                        }`}>{ep.method}</Badge>
                                                </td>
                                                <td className="py-1.5 px-2 font-mono text-slate-700">{ep.path}</td>
                                                <td className="py-1.5 px-2 text-slate-500 hidden sm:table-cell">{ep.desc}</td>
                                                <td className="py-1.5 px-2">
                                                    <Badge className={`text-xs ${ep.perm === 'full' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                                                        }`}>{ep.perm}</Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        {/* Query Parameters */}
                        <div>
                            <h4 className="font-semibold text-slate-900 mb-2 text-sm">🔍 Query Parameters <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">GET /inventory</code></h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {[
                                    { param: 'status', values: 'AVAILABLE, SOLD, RESERVED' },
                                    { param: 'location', values: 'Tên vị trí (Kho T3, Tủ Chứa T1...)' },
                                    { param: 'condition', values: 'NEW_SEAL, OPEN_BOX, USED, REPAIR' },
                                    { param: 'sku_id', values: 'Mã SKU (UUID)' },
                                    { param: 'limit', values: 'Số lượng trả về (mặc định: 100, max: 500)' },
                                    { param: 'offset', values: 'Bỏ qua N kết quả đầu (phân trang)' },
                                ].map((p, i) => (
                                    <div key={i} className="flex gap-2 py-1.5 px-2.5 rounded-md bg-slate-50 text-xs">
                                        <code className="text-blue-700 font-bold min-w-[65px]">{p.param}</code>
                                        <span className="text-slate-500">{p.values}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        {/* Permission Comparison */}
                        <div>
                            <h4 className="font-semibold text-slate-900 mb-2 text-sm">🔐 So Sánh Quyền</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="text-left py-2 px-2 text-slate-600">Tính năng</th>
                                            <th className="text-center py-2 px-2 text-blue-700">👁️ Read</th>
                                            <th className="text-center py-2 px-2 text-red-700">🔓 Full</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {[
                                            { feature: 'Xem danh sách tồn kho', read: true, full: true },
                                            { feature: 'Xem chi tiết sản phẩm', read: true, full: true },
                                            { feature: 'Xem SKU / Vị trí / Thống kê', read: true, full: true },
                                            { feature: 'Xem bán hàng / nhân viên', read: true, full: true },
                                            { feature: 'Thêm sản phẩm mới', read: false, full: true },
                                            { feature: 'Cập nhật sản phẩm', read: false, full: true },
                                            { feature: 'Xóa sản phẩm', read: false, full: true },
                                        ].map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className="py-1.5 px-2 text-slate-700">{row.feature}</td>
                                                <td className="py-1.5 px-2 text-center">
                                                    {row.read ? '✅' : '❌'}
                                                </td>
                                                <td className="py-1.5 px-2 text-center">
                                                    {row.full ? '✅' : '❌'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Create API Key Dialog */}
                <Dialog open={createDialogOpen} onOpenChange={(open) => {
                    setCreateDialogOpen(open);
                    if (!open) resetCreateForm();
                }}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Key className="h-5 w-5 text-amber-600" />
                                {newKeyResult ? 'API Key Đã Tạo' : 'Tạo API Key Mới'}
                            </DialogTitle>
                            <DialogDescription>
                                {newKeyResult
                                    ? 'Sao chép key bên dưới. Key sẽ không được hiển thị lại sau khi đóng.'
                                    : 'Chọn quyền truy cập cho API key mới'}
                            </DialogDescription>
                        </DialogHeader>

                        {newKeyResult ? (
                            <div className="space-y-4">
                                <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                                    <div className="flex items-start gap-2 mb-3">
                                        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-amber-800 font-medium">
                                            Lưu key ngay! Key sẽ không hiển thị lại.
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-md border border-amber-200 p-3">
                                        <code className="text-xs break-all text-slate-800 block">
                                            {newKeyResult}
                                        </code>
                                    </div>
                                    <Button
                                        onClick={() => copyToClipboard(newKeyResult)}
                                        className={`w-full mt-3 ${copied ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                                    >
                                        {copied ? (
                                            <><Check className="h-4 w-4 mr-2" /> Đã Sao Chép!</>
                                        ) : (
                                            <><Copy className="h-4 w-4 mr-2" /> Sao Chép API Key</>
                                        )}
                                    </Button>
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => { setCreateDialogOpen(false); resetCreateForm(); }}
                                >
                                    Đóng
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Tên API Key <span className="text-red-500">*</span></Label>
                                    <Input
                                        value={keyName}
                                        onChange={(e) => setKeyName(e.target.value)}
                                        placeholder="VD: N8N Integration, Webhook Bot..."
                                        required
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label>Quyền Truy Cập</Label>
                                    <div className="grid grid-cols-1 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setKeyPermission('read')}
                                            className={`text-left p-3 rounded-lg border-2 transition-all ${keyPermission === 'read'
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Eye className="h-4 w-4 text-blue-600" />
                                                <span className="font-semibold text-sm">Read Only</span>
                                                <Badge className="bg-blue-100 text-blue-800 text-xs">Khuyên Dùng</Badge>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 ml-6">
                                                Chỉ xem: sản phẩm, kho hàng, thống kê. Không thể sửa/xóa.
                                            </p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setKeyPermission('full')}
                                            className={`text-left p-3 rounded-lg border-2 transition-all ${keyPermission === 'full'
                                                ? 'border-red-500 bg-red-50'
                                                : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Shield className="h-4 w-4 text-red-600" />
                                                <span className="font-semibold text-sm">Full Access</span>
                                                <Badge className="bg-red-100 text-red-800 text-xs">Cẩn Thận</Badge>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 ml-6">
                                                Đầy đủ quyền: đọc, tạo, sửa, xóa sản phẩm.
                                            </p>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Mô Tả <span className="text-slate-400">(tùy chọn)</span></Label>
                                    <Input
                                        value={keyDescription}
                                        onChange={(e) => setKeyDescription(e.target.value)}
                                        placeholder="Ghi chú mục đích sử dụng..."
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setCreateDialogOpen(false)}
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="flex-1 bg-amber-600 hover:bg-amber-700"
                                        disabled={creating || !keyName.trim()}
                                    >
                                        {creating ? (
                                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang Tạo...</>
                                        ) : (
                                            <><Key className="h-4 w-4 mr-2" /> Tạo API Key</>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-red-600">
                                <AlertTriangle className="h-5 w-5" />
                                Xóa API Key
                            </DialogTitle>
                            <DialogDescription>
                                Bạn có chắc muốn xóa API key <strong>"{keyToDelete?.name}"</strong>?
                                Tất cả ứng dụng sử dụng key này sẽ bị mất quyền truy cập.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setDeleteDialogOpen(false)}
                            >
                                Hủy
                            </Button>
                            <Button
                                onClick={handleDelete}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Xóa Vĩnh Viễn
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* API Documentation Dialog */}
                <Dialog open={docsDialogOpen} onOpenChange={setDocsDialogOpen}>
                    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-blue-600" />
                                Tài Liệu API
                            </DialogTitle>
                            <DialogDescription>
                                Hướng dẫn sử dụng API cho phần mềm bên thứ 3
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-5 text-sm">
                            {/* Base URL */}
                            <div>
                                <h4 className="font-semibold text-slate-900 mb-2">🔗 Base URL</h4>
                                <div className="bg-slate-900 text-green-400 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                                    {SUPABASE_URL}/functions/v1/api
                                </div>
                            </div>

                            {/* Authentication */}
                            <div>
                                <h4 className="font-semibold text-slate-900 mb-2">🔑 Xác Thực</h4>
                                <p className="text-slate-600 mb-2">
                                    Thêm header <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">Authorization</code> vào mỗi request:
                                </p>
                                <div className="bg-slate-900 text-green-400 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                                    Authorization: Bearer YOUR_API_KEY
                                </div>
                            </div>

                            {/* Endpoints */}
                            <div>
                                <h4 className="font-semibold text-slate-900 mb-2">📋 Endpoints</h4>
                                <div className="space-y-2">
                                    {[
                                        { method: 'GET', path: '/inventory', desc: 'Danh sách sản phẩm tồn kho', perm: 'read' },
                                        { method: 'GET', path: '/inventory/:serial', desc: 'Chi tiết sản phẩm', perm: 'read' },
                                        { method: 'GET', path: '/sku', desc: 'Danh sách mã SKU', perm: 'read' },
                                        { method: 'GET', path: '/sku/:sku_id', desc: 'Chi tiết SKU + items', perm: 'read' },
                                        { method: 'GET', path: '/locations', desc: 'Vị trí kho + số lượng', perm: 'read' },
                                        { method: 'GET', path: '/stats', desc: 'Thống kê tổng quan kho', perm: 'read' },
                                        { method: 'POST', path: '/inventory', desc: 'Thêm sản phẩm mới', perm: 'full' },
                                        { method: 'PUT', path: '/inventory/:serial', desc: 'Cập nhật sản phẩm', perm: 'full' },
                                        { method: 'DELETE', path: '/inventory/:serial', desc: 'Xóa sản phẩm', perm: 'full' },
                                        { method: 'GET', path: '/sales', desc: 'Dữ liệu bán hàng', perm: 'read' },
                                        { method: 'GET', path: '/products', desc: 'Sản phẩm bán', perm: 'read' },
                                        { method: 'GET', path: '/staff', desc: 'Nhân viên', perm: 'read' },
                                    ].map((ep, i) => (
                                        <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-slate-50">
                                            <Badge className={`text-xs font-mono min-w-[55px] justify-center ${ep.method === 'GET' ? 'bg-green-100 text-green-800' :
                                                ep.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                                                    ep.method === 'PUT' ? 'bg-amber-100 text-amber-800' :
                                                        'bg-red-100 text-red-800'
                                                }`}>
                                                {ep.method}
                                            </Badge>
                                            <code className="text-xs text-slate-700 font-mono flex-1">
                                                {ep.path}
                                            </code>
                                            <span className="text-xs text-slate-500 hidden sm:inline">{ep.desc}</span>
                                            <Badge className={`text-xs ${ep.perm === 'full' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                                                }`}>
                                                {ep.perm}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Filter Parameters */}
                            <div>
                                <h4 className="font-semibold text-slate-900 mb-2">🔍 Query Parameters (GET /inventory)</h4>
                                <div className="space-y-1 text-xs">
                                    {[
                                        { param: 'status', desc: 'AVAILABLE, SOLD, RESERVED' },
                                        { param: 'location', desc: 'Tên vị trí (VD: Kho T3, Tủ Chứa T1)' },
                                        { param: 'condition', desc: 'NEW_SEAL, OPEN_BOX, USED, REPAIR' },
                                        { param: 'sku_id', desc: 'Mã SKU' },
                                        { param: 'limit', desc: 'Số lượng (mặc định: 100, tối đa: 500)' },
                                        { param: 'offset', desc: 'Phân trang' },
                                    ].map((p, i) => (
                                        <div key={i} className="flex gap-2 py-1 px-2 rounded bg-slate-50">
                                            <code className="text-blue-700 font-semibold min-w-[70px]">{p.param}</code>
                                            <span className="text-slate-500">{p.desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Example */}
                            <div>
                                <h4 className="font-semibold text-slate-900 mb-2">💡 Ví Dụ cURL</h4>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Lấy danh sách tồn kho:</p>
                                        <div className="bg-slate-900 text-green-400 rounded-lg p-3 font-mono text-xs overflow-x-auto whitespace-pre">
                                            {`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  "${SUPABASE_URL}/functions/v1/api/inventory"`}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Lọc theo vị trí:</p>
                                        <div className="bg-slate-900 text-green-400 rounded-lg p-3 font-mono text-xs overflow-x-auto whitespace-pre">
                                            {`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  "${SUPABASE_URL}/functions/v1/api/inventory?location=Kho%20T3"`}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Xem thống kê:</p>
                                        <div className="bg-slate-900 text-green-400 rounded-lg p-3 font-mono text-xs overflow-x-auto whitespace-pre">
                                            {`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  "${SUPABASE_URL}/functions/v1/api/stats"`}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
};

export default ApiKeyManagement;
