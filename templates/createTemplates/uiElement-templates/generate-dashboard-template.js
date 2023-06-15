/* eslint-disable */

const generateDashboardTemplateJs = () => `
import React from 'react';
import { Bar, Line } from 'react-chartjs-2';
import Chart from 'chart.js/auto';

const Dashboard = () => {
  const barChartData = {
    labels: ['January', 'February', 'March', 'April', 'May', 'June'],
    datasets: [
      {
        label: 'Sales',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
        hoverBackgroundColor: 'rgba(75, 192, 192, 0.4)',
        hoverBorderColor: 'rgba(75, 192, 192, 1)',
        data: [65, 59, 80, 81, 56, 55],
      },
    ],
  };

  const lineChartData = {
    labels: ['January', 'February', 'March', 'April', 'May', 'June'],
    datasets: [
      {
        label: 'Revenue',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        hoverBackgroundColor: 'rgba(54, 162, 235, 0.4)',
        hoverBorderColor: 'rgba(54, 162, 235, 1)',
        data: [1000, 1500, 1200, 1800, 900, 2000],
      },
    ],
  };

  return (
    <div className='container mx-auto px-4 py-8'>
      <h1 className='text-2xl mb-4'>Dashboard</h1>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div className='bg-white rounded shadow p-4'>
          <h2 className='text-lg font-bold mb-2'>Total Users</h2>
          <p className='text-gray-600'>500</p>
        </div>

        <div className='bg-white rounded shadow p-4'>
          <h2 className='text-lg font-bold mb-2'>Total Orders</h2>
          <p className='text-gray-600'>1000</p>
        </div>

        <div className='bg-white rounded shadow p-4'>
          <h2 className='text-lg font-bold mb-2'>Revenue</h2>
          <p className='text-gray-600'>$10,000</p>
        </div>

        <div className='bg-white rounded shadow p-4'>
          <h2 className='text-lg font-bold mb-2'>Average Order Value</h2>
          <p className='text-gray-600'>$50</p>
        </div>

        <div className='bg-white rounded shadow p-4'>
          <h2 className='text-lg font-bold mb-4'>Sales Chart</h2>
          <Bar data={barChartData} />
        </div>

        <div className='bg-white rounded shadow p-4'>
          <h2 className='text-lg font-bold mb-4'>Revenue Chart</h2>
          <Line data={lineChartData} />
        </div>
        <div className='bg-white rounded shadow p-4 col-span-2'>
          <h2 className='text-lg font-bold mb-4'>Other Component</h2>
          <p className='text-gray-600'>
            This is another component in the dashboard.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;`

module.exports = { generateDashboardTemplateJs }
