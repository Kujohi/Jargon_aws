"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/app/provider";
import { useDataRefresh } from "@/context/DataRefreshContext";
import { Line } from "react-chartjs-2";
import axios from "axios";

import {
  Chart as ChartJS,
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import "chartjs-adapter-date-fns";

ChartJS.register(
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function SavingsChart() {
  const { user } = useUser();
  const { refreshTrigger } = useDataRefresh();
  const [dataPoints, setDataPoints] = useState([]);
  const [labels, setLabels] = useState([]);
  const [forecastLabels, setForecastLabels] = useState([]);
  const [forecastPoints, setForecastPoints] = useState([]);
  const [savingTarget, setSavingTarget] = useState(0);
  const [loading, setLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(false);

  // Helper function to normalize amounts - handles both cents and VND
  const normalizeAmount = (amountCents) => {
    if (!amountCents) return 0;
    // The amounts from the database are in cents, so always divide by 100
    return amountCents / 1;
  };

  useEffect(() => {
    if (!user?.id) return;
    console.log("SavingsChart: Refreshing data, refreshTrigger:", refreshTrigger);
    setLoading(true);

    // 1) Get the user's saving target
    fetch(`/api/savings/target?userId=${user.id}`)
      .then(res => res.json())
      .then(response => {
        console.log("SavingsChart: Saving target raw:", response.target);
        console.log("SavingsChart: Saving target converted:", response.target / 1);
        setSavingTarget(response.target / 100 || 0); // Convert cents to VND units
      })
      .catch(err => {
        console.error("Error fetching saving target:", err);
        setSavingTarget(0);
      });

    // 2) Get the Savings jar
    fetch(`/api/jars/dashboard?userId=${user.id}`)
      .then(res => res.json())
      .then(async (response) => {
        const jars = response.data?.jars || [];
        console.log("SavingsChart: All jars received:", jars);
        console.log("SavingsChart: Looking for jar with category_name 'Savings'");
        
        // Try to find savings jar with different possible names
        const savingsJar = jars.find((jar) => 
          jar.category_name === "Savings" || 
          jar.category_name === "Long Term Savings" ||
          jar.category_name === "Financial Freedom" ||
          jar.category_id === 6  // Direct ID match for Savings jar
        );
        console.log("SavingsChart: Found savings jar:", savingsJar);
        
        if (!savingsJar) {
          console.log("SavingsChart: No savings jar found!");
          console.log("Available jars:", jars.map(j => ({
            id: j.category_id,
            name: j.category_name,
            balance: j.current_balance_cents
          })));
          setLabels([]);
          setDataPoints([]);
          setForecastLabels([]);
          setForecastPoints([]);
          setLoading(false);
          return;
        }

        // 2) Fetch transactions & build daily cumulative
        console.log("SavingsChart: Fetching transactions for jar ID:", savingsJar.category_id);
        const transactionsResponse = await fetch(`/api/transactions?userId=${user.id}&jarCategoryId=${savingsJar.category_id}&limit=all`);
        const transactionsData = await transactionsResponse.json();
        const transactions = transactionsData.transactions || [];
        console.log("SavingsChart: Retrieved transactions:", transactions.length);
        console.log("SavingsChart: Sample transactions:", transactions.slice(0, 3).map(t => ({
          amount_cents: t.amount_cents,
          amount_vnd: t.amount_cents / 1,
          date: t.occurred_at,
          description: t.description
        })));

        const daily = {};
        let runningBalance = 0;
        transactions
          .sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at))
          .forEach((tx) => {
            const day = tx.occurred_at.slice(0, 10);
            runningBalance += normalizeAmount(tx.amount_cents);
            daily[day] = runningBalance;
          });

        const sortedDays = Object.keys(daily).sort();
        const balances = sortedDays.map((d) => daily[d]);
        console.log("SavingsChart: Daily balances calculated:", sortedDays.length, "days");
        console.log("SavingsChart: Running balance progression:", balances.slice(0, 5), "...", balances.slice(-2));
        console.log("SavingsChart: Final balance:", balances[balances.length - 1], "VND");

        setLabels(sortedDays);
        setDataPoints(balances);
        setLoading(false);

        // 3) Prepare monthly data & call forecast
        if (sortedDays.length) {
          setForecastLoading(true);

          const monthlyData = [];
          let lastMonth = null, lastDate = null, lastBalance = null;
          sortedDays.forEach((date, idx) => {
            const month = date.slice(0, 7);
            if (month !== lastMonth && lastDate) {
              monthlyData.push({ date: lastDate, balance: lastBalance });
              lastMonth = month;
            }
            lastDate = date;
            lastBalance = balances[idx];
          });
          if (lastDate) {
            monthlyData.push({ date: lastDate, balance: lastBalance });
          }

          try {
            console.log("SavingsChart: Calling forecast API with data:", {
              monthlyDataLength: monthlyData.length,
              savingTarget: savingTarget,
              lastBalance: monthlyData[monthlyData.length - 1]?.balance
            });
            
            // Import the ML service configuration
            const { makeForecastRequest } = await import('@/services/mlServiceConfig');
            
            const data = await makeForecastRequest(
              monthlyData, 
              savingTarget > 0 ? savingTarget : 10000.0,
              {
                periods: 6,
                freq: "M",
                lags: 12
              }
            );
            
            console.log("SavingsChart: Forecast API response:", data);
            
            // Filter forecast to only include dates after the last actual date
            const lastActualDate = new Date(sortedDays[sortedDays.length - 1]);
            const filteredForecast = data.forecast.filter(f => {
              const forecastDate = new Date(f.date);
              return forecastDate > lastActualDate;
            });
            
            setForecastLabels(filteredForecast.map((f) => f.date));
            setForecastPoints(filteredForecast.map((f) => f.yhat));
          } catch (err) {
            console.error("Forecast API error", err);
            setForecastLabels([]);
            setForecastPoints([]);
          } finally {
            setForecastLoading(false);
          }
        }
      })
      .catch(error => {
        console.error('Error fetching savings data:', error);
        setLoading(false);
      });
  }, [user?.id, refreshTrigger]);

  // Build the datasets with {x,y} points
  const actualDataset = {
    label: "Actual Savings (VND)",
    data: labels.map((d, i) => ({ x: d, y: dataPoints[i] })),
    borderColor: "#10b981",
    backgroundColor: "#d1fae5",
    tension: 0.3,
    spanGaps: true,
  };
  
  console.log("SavingsChart: Chart data points:", {
    labelsCount: labels.length,
    dataPointsCount: dataPoints.length,
    firstPoints: labels.slice(0, 3).map((d, i) => ({ x: d, y: dataPoints[i] })),
    lastPoints: labels.slice(-3).map((d, i) => ({ x: d, y: dataPoints[labels.length - 3 + i] }))
  });

  const forecastDataset = {
    label: "Forecast (VND)",
    data: labels.length && forecastLabels.length
      ? [
          // Start from the last actual point for smooth connection
          { x: labels[labels.length - 1], y: dataPoints[dataPoints.length - 1] },
          // Then add all forecast points (these should be future dates only)
          ...forecastLabels.map((d, i) => ({ x: d, y: forecastPoints[i] }))
        ]
      : [],
    borderColor: "#f59e42",
    borderDash: [8, 4],
    backgroundColor: "rgba(245, 158, 66, 0.1)",
    tension: 0.3,
    spanGaps: true,
    pointRadius: (context) => {
      // Hide the first point (connection point) to avoid overlap
      return context.dataIndex === 0 ? 0 : 3;
    },
    // Ensure forecast only shows from the connection point forward
    showLine: true,
  };

  // Target line dataset
  const targetDataset = savingTarget > 0 ? {
    label: `Target (${savingTarget.toLocaleString()} VND)`,
    data: labels.length > 0 ? [
      // Start from the first actual date
      { x: labels[0], y: savingTarget },
      // End at the last forecast date (or last actual date if no forecast)
      { x: forecastLabels.length > 0 ? forecastLabels[forecastLabels.length - 1] : labels[labels.length - 1], y: savingTarget }
    ] : [],
    borderColor: "#ef4444",
    borderDash: [2, 2],
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    tension: 0,
    spanGaps: true,
    pointRadius: 0,
    showLine: true,
  } : null;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Balance Over Time</h2>
      {loading ? (
        <div>Loading savings chart...</div>
      ) : labels.length === 0 ? (
        <div>No savings data available.</div>
      ) : (
        <Line
          data={{ datasets: [actualDataset, forecastDataset, targetDataset].filter(Boolean) }}
          options={{
            responsive: true,
            plugins: {
              legend: { position: "top" },
              title: { display: false },
            },
            scales: {
              x: {
                type: "time",
                time: {
                  unit: "month",
                  displayFormats: {
                    month: "MMM yyyy"
                  },
                  tooltipFormat: "MMM d, yyyy"
                },
                title: { display: true, text: "Date" },
                ticks: {
                  maxTicksLimit: 8
                }
              },
              y: {
                beginAtZero: true,
                title: { display: true, text: "Balance (VND)" },
                ticks: {
                  callback: function(value) {
                    return value.toLocaleString() + " VND";
                  }
                }
              }
            }
          }}
        />
      )}
      {forecastLoading && <div>Loading forecast...</div>}
    </div>
  );
} 