import React from 'react'
import Navbar from './components/Navbar'
import { NavLink } from "react-router-dom";

const App = () => {
  return (
    <div className='bg-gradient-to-t from-black via-black to-blue-950 min-h-screen'>
      <div className='flex justify-center items-center pt-6'>
      <Navbar />
      </div>

    <div className='flex justify-center items-center text-7xl pt-36 text-blue-300 font-bold'>Archyeild</div>

    <NavLink to='/pools'>
    <div className='flex justify-center items-center pt-12'><button className='text-white bg-blue-600 py-1 px-6 rounded-2xl'>Explore pools</button></div></NavLink>
    </div>
  )
}

export default App
