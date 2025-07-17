import { LayoutDashboard, Wallet, Receipt, BarChart2 } from "lucide-react";

export const SideBarOptions = [
    {
        name: 'Dashboard',
        icon: LayoutDashboard,
        path: '/dashboard',
    },
    {
        name: 'Jars',
        icon: Wallet,
        path: '/jars',
    },
    {
        name: 'Transactions',
        icon: Receipt,
        path: '/transactions',
    },
    {
        name: 'Analytics',
        icon: BarChart2,
        path: '/analytics',
    },
]