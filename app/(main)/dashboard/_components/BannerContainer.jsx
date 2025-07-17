import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function BannerContainer(){
    return(
        <div className="space-y-4 px-4">
            <div className="relative w-full h-[250px] rounded-xl overflow-hidden bg-gradient-to-r from-teal-600 to-green-400 p-8 flex flex-col justify-center">
                <div className="relative z-10">
                    <div className="text-white mb-2 uppercase tracking-wide text-sm">Jargon AI DASHBOARD</div>
                    <h1 className="text-3xl font-bold text-white mb-6 max-w-[600px]">
                        Manage Your Finances With Smart Tools and Insights
                    </h1>
                    <p className="text-white/80 text-lg max-w-[500px]">
                        Track your spending, set financial goals, and get personalized recommendations to achieve financial success.
                    </p>
                </div>
                <div className="absolute right-0 bottom-0 w-[300px] h-[300px] bg-green-300 rounded-full opacity-30 transform translate-x-1/4 translate-y-1/4"></div>
            </div>
        </div>
    )
}

export default BannerContainer