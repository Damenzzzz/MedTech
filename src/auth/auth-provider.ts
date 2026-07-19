export interface DemoProfile{id:string;displayName:string;createdAt:string}
export interface AuthProvider{getProfile():Promise<DemoProfile|null>;signIn(displayName:string):Promise<DemoProfile>;signOut():Promise<void>}
const key='kms-demo-profile';
export const localAuthProvider:AuthProvider={async getProfile(){const value=localStorage.getItem(key);return value?JSON.parse(value) as DemoProfile:null},async signIn(displayName){const profile={id:crypto.randomUUID(),displayName,createdAt:new Date().toISOString()};localStorage.setItem(key,JSON.stringify(profile));return profile},async signOut(){localStorage.removeItem(key)}};
