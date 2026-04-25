import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../services/apiClient";
import { showNotification, showConfirm } from "../utils/notifications";
import { StaggerItem, StaggerPage } from "../components/ui/PageTransition";
import { Loader2, CheckCircle2, XCircle, Mail, User, Phone } from "lucide-react";
import { motion } from "framer-motion";

type PendingUser = {
  id: number | string;
  usuario: string;
  nombre: string;
  apellidos: string;
  email: string;
  telefono?: string;
  fecha_creacion?: string;
  status: string;
};

type ApprovalResponse = {
  success?: boolean;
  ok?: boolean;
  message?: string;
};

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: { message?: string };
  message?: string;
};

export default function AdminApprovalPage() {
  const queryClient = useQueryClient();
  const [approvingId, setApprovingId] = useState<number | string | null>(null);
  const [rejectingId, setRejectingId] = useState<number | string | null>(null);

  const { data: pendingUsers = [], isLoading, isError, error } = useQuery<PendingUser[]>({
    queryKey: ["pendingUsers"],
    queryFn: async () => {
      const response = await apiFetch<PendingUser[] | ApiEnvelope<PendingUser[]>>("/usuarios/requests", {
        method: "GET",
      });
      if (Array.isArray(response)) {
        return response;
      }

      if (response && typeof response === "object" && Array.isArray((response as ApiEnvelope<PendingUser[]>).data)) {
        return (response as ApiEnvelope<PendingUser[]>).data as PendingUser[];
      }

      return [];
    },
    refetchInterval: 10000,
  });

  const approveMutation = useMutation({
    mutationFn: async (userId: number | string) => {
      const response = await apiFetch<ApprovalResponse>(`/usuarios/${userId}/approve`, {
        method: "POST",
      });
      return response;
    },
    onSuccess: (data, userId) => {
      setApprovingId(null);
      queryClient.invalidateQueries({ queryKey: ["pendingUsers"] });
      showNotification(
        data?.message || "Cuenta aprobada exitosamente",
        "success"
      );
    },
    onError: (error: any) => {
      setApprovingId(null);
      showNotification(
        error?.message || "Error al aprobar la cuenta",
        "error"
      );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (userId: number | string) => {
      const response = await apiFetch<ApprovalResponse>(`/usuarios/${userId}/reject`, {
        method: "DELETE",
      });
      return response;
    },
    onSuccess: (data, userId) => {
      setRejectingId(null);
      queryClient.invalidateQueries({ queryKey: ["pendingUsers"] });
      showNotification(
        data?.message || "Solicitud rechazada",
        "success"
      );
    },
    onError: (error: any) => {
      setRejectingId(null);
      showNotification(
        error?.message || "Error al rechazar la solicitud",
        "error"
      );
    },
  });

  const handleApprove = async (userId: number | string) => {
    setApprovingId(userId);
    await approveMutation.mutateAsync(userId);
  };

  const handleReject = async (userId: number | string) => {
    const confirmResult = await showConfirm(
      "¿Estás seguro de que deseas rechazar esta solicitud?"
    );
    if (confirmResult) {
      setRejectingId(userId);
      await rejectMutation.mutateAsync(userId);
    }
  };

  return (
    <StaggerPage>
      <div className="p-6 max-w-7xl mx-auto">
        <StaggerItem>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Administración de Solicitudes
            </h1>
            <p className="text-slate-600">
              Gestiona las solicitudes de creación de cuentas pendientes de aprobación
            </p>
          </div>
        </StaggerItem>

        {isLoading ? (
          <StaggerItem>
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
          </StaggerItem>
        ) : isError ? (
          <StaggerItem>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">
                {error instanceof Error ? error.message : "Error al cargar las solicitudes"}
              </p>
            </div>
          </StaggerItem>
        ) : pendingUsers.length === 0 ? (
          <StaggerItem>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <p className="text-blue-900 text-lg font-medium">
                No hay solicitudes pendientes
              </p>
              <p className="text-blue-700 text-sm mt-1">
                Todas las solicitudes han sido procesadas
              </p>
            </div>
          </StaggerItem>
        ) : (
          <div className="grid gap-4">
            {pendingUsers.map((user, index) => (
              <StaggerItem key={user.id}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="flex items-center mb-3">
                        <User className="w-5 h-5 text-slate-500 mr-2" />
                        <div>
                          <p className="text-sm text-slate-600">Usuario</p>
                          <p className="font-semibold text-slate-900">{user.usuario}</p>
                        </div>
                      </div>
                      <div className="mb-3">
                        <p className="text-sm text-slate-600">Nombre Completo</p>
                        <p className="font-medium text-slate-900">
                          {user.nombre} {user.apellidos}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center mb-3">
                        <Mail className="w-5 h-5 text-slate-500 mr-2" />
                        <div>
                          <p className="text-sm text-slate-600">Correo</p>
                          <p className="font-medium text-slate-900">{user.email}</p>
                        </div>
                      </div>
                      {user.telefono && (
                        <div>
                          <div className="flex items-center">
                            <Phone className="w-5 h-5 text-slate-500 mr-2" />
                            <div>
                              <p className="text-sm text-slate-600">Teléfono</p>
                              <p className="font-medium text-slate-900">{user.telefono}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 flex gap-3 justify-end">
                    <button
                      onClick={() => handleReject(user.id)}
                      disabled={rejectingId === user.id || approvingId === user.id}
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors font-medium"
                    >
                      {rejectingId === user.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Rechazando...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          Rechazar
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleApprove(user.id)}
                      disabled={approvingId === user.id || rejectingId === user.id}
                      className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors font-medium"
                    >
                      {approvingId === user.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Aprobando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Aprobar
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </div>
        )}
      </div>
    </StaggerPage>
  );
}
