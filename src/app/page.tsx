import Website from '@/components/Website';
const business={
 '@context':'https://schema.org','@type':'LocalBusiness','@id':'https://jazbafuelsllp.com/#organisation',
 name:'Jazba Fuels LLP',url:'https://jazbafuelsllp.com/',telephone:'+919004777892',
 description:'Mumbai-based doorstep diesel delivery and commercial fuel logistics.',
 logo:'https://jazbafuelsllp.com/brand/jazba-fuels-logo-640.webp',image:'https://jazbafuelsllp.com/brand/delivery-truck.webp',
 address:{'@type':'PostalAddress',streetAddress:'Shop No. 9, Ashapura Shopping Center, C.S.C. Road-02, Opposite SVC Bank, Anand Nagar, Dahisar East',addressLocality:'Mumbai',addressRegion:'Maharashtra',postalCode:'400068',addressCountry:'IN'},
 areaServed:{'@type':'City',name:'Mumbai'}
};
export default function Home(){return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(business).replace(/</g,'\\u003c')}}/><Website data={{settings:{},announcements:[],release:null}}/></>;}
