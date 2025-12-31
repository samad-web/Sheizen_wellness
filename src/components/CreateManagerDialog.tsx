import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CreateManagerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function CreateManagerDialog({ open, onOpenChange, onSuccess }: CreateManagerDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
    });

    const resetForm = () => {
        setFormData({
            name: "",
            email: "",
            phone: "",
            password: "",
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validate inputs
            if (!formData.email || !formData.password || !formData.name || !formData.phone) {
                toast.error("All fields are required");
                return;
            }

            if (formData.password.length < 6) {
                toast.error("Password must be at least 6 characters");
                return;
            }

            // Use create-admin Edge Function with role parameter
            const { data: funcData, error: funcError } = await supabase.functions.invoke('create-admin', {
                body: {
                    email: formData.email,
                    password: formData.password,
                    role: 'manager', // Specify manager role
                    userData: {
                        name: formData.name,
                        phone: formData.phone,
                    },
                },
            });

            if (funcError) {
                console.error("Edge Function Error:", funcError);
                throw funcError;
            }
            if (funcData?.error) {
                console.error("Edge Function Data Error:", funcData.error);
                throw new Error(funcData.error);
            }

            toast.success("Manager account created successfully!");
            resetForm();
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error("Error creating manager:", error);
            toast.error(error.message || "Failed to create manager account");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Create Manager Account</DialogTitle>
                    <DialogDescription>
                        Create a new manager account with dashboard access but restricted from viewing personal client information.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="John Doe"
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="manager@example.com"
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="phone">Phone *</Label>
                        <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+1234567890"
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="password">Password *</Label>
                        <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Minimum 6 characters
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                resetForm();
                                onOpenChange(false);
                            }}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Manager
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
