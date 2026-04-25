import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function CheckAuth(props) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    // support either `protectedRoute` or `protected` prop name
    const protectedRoute = typeof props.protectedRoute !== 'undefined' ? props.protectedRoute : props.protected;
    const children = props.children;

    useEffect(() => {
        const token = localStorage.getItem('token')
        if(protectedRoute){
            if(!token){
                navigate('/login')
            } else {
                setLoading(false);
            }
        }else {
            if(token){
                navigate('/')
            } else {
                setLoading(false);
            }
        }
    }, [navigate, protectedRoute])

  if(loading) {
    return <div>Loading...</div>
  }

    return children;
}

export default CheckAuth