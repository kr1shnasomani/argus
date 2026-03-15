import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getAllTickets } from "@/services/agent";
import { Table, TableCell, TableHead, TableHeader, TableRow, TableBody } from "@/components/ui/table";
import { motion } from "framer-motion";
import { QueueSkeleton } from "@/components/ui/skeleton-loaders";
import { Badge } from "@/components/ui/badge";

export const TicketHistory = () => {
  const navigate = useNavigate();

  const { data: tickets, isLoading, isError } = useQuery({
    queryKey: ["agent-all-tickets"],
    queryFn: getAllTickets,
    refetchInterval: 15000,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Ticket History</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            View all tickets across the system, including system auto-resolutions and human-escalated cases.
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card/50 backdrop-blur-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <QueueSkeleton />
        ) : isError ? (
          <div className="p-8 text-center text-destructive">
            Failed to load ticket history. Please check your connection.
          </div>
        ) : !tickets || tickets.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
            <h4 className="text-lg font-medium text-foreground mb-1">No tickets found</h4>
            <p className="max-w-sm">No tickets have been recorded in the system yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="w-[120px]">Ticket ID</TableHead>
                  <TableHead className="w-[140px]">Date</TableHead>
                  <TableHead className="w-[200px]">User</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Severity</TableHead>
                  <TableHead className="w-[120px] text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((t) => (
                  <TableRow 
                    key={t.id}
                    className="cursor-pointer group hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/agent/ticket/${t.id}`, { state: { from: '/agent/history' } })}
                  >
                    <TableCell className="font-medium text-xs font-mono text-muted-foreground">
                      {t.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatDate(t.created_at)}
                    </TableCell>
                    <TableCell className="text-sm truncate max-w-[200px]">
                      {t.users?.email || t.user_id}
                    </TableCell>
                    <TableCell className="text-sm truncate max-w-[300px]">
                      {t.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        t.severity === "P1" ? "border-red-500/30 text-red-500 bg-red-500/10" :
                        t.severity === "P2" ? "border-orange-500/30 text-orange-500 bg-orange-500/10" :
                        "border-muted-foreground/30 text-muted-foreground"
                      }>
                        {t.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={
                          t.status === "resolved" || t.status === "auto_resolved" ? "default" :
                          t.status === "escalated" ? "destructive" : "secondary"
                        }
                        className={
                          t.status === "resolved" || t.status === "auto_resolved" ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20" : ""
                        }
                      >
                        {t.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default TicketHistory;