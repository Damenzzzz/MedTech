'use client';
import {useEffect} from 'react';
export function ThemeProvider({children}:{children:React.ReactNode}){useEffect(()=>{const saved=localStorage.getItem('kms-theme');if(saved==='dark'||(!saved&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')},[]);return children}
