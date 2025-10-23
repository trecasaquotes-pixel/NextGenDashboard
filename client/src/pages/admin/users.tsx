import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Shield, User as UserIcon, Briefcase, Palette } from "lucide-react";
import { useLocation } from "wouter";
import type { User, UserRole, userRoleEnum } from "@shared/schema";

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";

async function getUsers(): Promise<User[]> {
  const res = await fetch("/api/admin/users", {
    credentials: "include",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to fetch users");
  }
  return res.json();
}

async function updateUserRole(userId: string, role: UserRole): Promise<User> {
  const res = await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
  return res.json();
}

const roleIcons = {
  admin: Shield,
  sales: Briefcase,
  designer: Palette,
};

const roleColors = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  sales: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  designer: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
};

export default function AdminUsersPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "Please log in to access admin features",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [isAuthenticated, authLoading, navigate, toast]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user && user.role !== "admin") {
      toast({
        title: "Access Denied",
        description: "Only administrators can access user management",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [user, authLoading, isAuthenticated, navigate, toast]);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: getUsers,
    enabled: isAuthenticated && user?.role === "admin",
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      updateUserRole(userId, role),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: `User role updated to ${data.role}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    if (userId === user?.id) {
      toast({
        title: "Cannot Change Own Role",
        description: "You cannot change your own role",
        variant: "destructive",
      });
      return;
    }

    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const formatDate = (dateString: Date | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getRoleIcon = (role: string) => {
    const Icon = roleIcons[role as UserRole] || UserIcon;
    return <Icon className="w-4 h-4" />;
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <p data-testid="text-loading">Loading...</p>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-1 px-4 py-6 max-w-7xl mx-auto w-full">
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
              User Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage user roles and permissions
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              View and manage user roles. Admins have full access, sales can manage quotations,
              and designers can create designs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ") || "No name";
                  const isCurrentUser = u.id === user?.id;

                  return (
                    <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span data-testid={`text-user-name-${u.id}`}>{fullName}</span>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-user-email-${u.id}`}>
                        {u.email || "No email"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={roleColors[u.role as UserRole] || ""}
                          data-testid={`badge-user-role-${u.id}`}
                        >
                          <span className="flex items-center gap-1">
                            {getRoleIcon(u.role)}
                            {u.role}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-user-joined-${u.id}`}>
                        {formatDate(u.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.role}
                          onValueChange={(newRole: UserRole) => handleRoleChange(u.id, newRole)}
                          disabled={isCurrentUser || updateRoleMutation.isPending}
                        >
                          <SelectTrigger
                            className="w-32"
                            data-testid={`select-role-${u.id}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin" data-testid={`option-role-admin-${u.id}`}>
                              <span className="flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                Admin
                              </span>
                            </SelectItem>
                            <SelectItem value="sales" data-testid={`option-role-sales-${u.id}`}>
                              <span className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4" />
                                Sales
                              </span>
                            </SelectItem>
                            <SelectItem value="designer" data-testid={`option-role-designer-${u.id}`}>
                              <span className="flex items-center gap-2">
                                <Palette className="w-4 h-4" />
                                Designer
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
      <AppFooter />
    </div>
  );
}
