require('dotenv').config({ path: '.env.local' })
console.log('POSTGRES_URL:', process.env.POSTGRES_URL)
console.log('POSTGRES_URL_NON_POOLING:', process.env.POSTGRES_URL_NON_POOLING)