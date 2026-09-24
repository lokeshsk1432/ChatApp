
import toast from 'react-hot-toast'
import './App.css'
import { useState } from 'react'
import JoinCreateChat from './components/JoinCreateChat';

function App() {
  const [count, setCount] =useState(0);
  return (
   <div>
      <JoinCreateChat />
   </div>
  )
}

export default App
