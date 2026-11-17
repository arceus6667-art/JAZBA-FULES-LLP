import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Jazba Fuels LLP | Doorstep Diesel Delivery',description:'Mumbai-based commercial fuel logistics. Discover Jazba Fuels LLP.',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
