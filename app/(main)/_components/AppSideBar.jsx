"use client"
import { Button } from "@/components/ui/button"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
  } from "@/components/ui/sidebar"
import { SideBarOptions } from "@/services/Constant"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { clientAuthService } from "@/services/clientAuthService"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useUser } from "@/app/provider"
import { LayoutDashboard, Wallet, PiggyBank, BarChart2 } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Jars', href: '/jars', icon: PiggyBank },
  { name: 'Transactions', href: '/transactions', icon: Wallet },
  { name: 'Analytics', href: '/analytics', icon: BarChart2 },
]
  
export function AppSidebar() {
    const path = usePathname()
    const router = useRouter()
    const { setUser } = useUser()

    const handleLogout = async () => {
        try {
            // Use client auth service for logout
            clientAuthService.signOut();
            setUser(null);
            toast.success("Logged out successfully");
            router.push("/");
        } catch (error) {
            toast.error("Error logging out: " + error.message);
        }
    }

    return (
      <Sidebar collapsible="none" className="border-r">
        <SidebarHeader className= 'flex items-center mt-5'>
            <Image src={'/image.png'} alt="logo" width ={200}
                height = {100}
                className="w-[300px] h-[200px]"
            />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel> Overview </SidebarGroupLabel>
            <SidebarContent>
                <SidebarMenu>
                    {SideBarOptions.map((option, index) => (
                        <SidebarMenuItem key ={index} className= 'p-1'>
                            <SidebarMenuButton asChild className= 'p-5'>
                                <Link href={option.path}>
                                    <option.icon className={`${path == option.path && 'text-primary'}`}/>
                                    <span className={`text-[16px] ${path == option.path && 'text-primary'}`}>
                                        {option.name}
                                    </span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel> </SidebarGroupLabel>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
            <SidebarMenuItem>
                <Button 
                    onClick={handleLogout}
                    variant="ghost"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 w-full justify-start"
                >
                    Logout
                </Button>
            </SidebarMenuItem>
        </SidebarFooter>
      </Sidebar>
    )
  }
  