import axios from 'axios'

const api = axios.create({
  baseURL: '', // same origin
})

export function setAuth(token){
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

export default api
