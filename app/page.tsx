export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>CN Database API</h1>
      <p>USDA Child Nutrition Database API - RESTful API with usage-based billing</p>

      <h2>API Endpoints</h2>
      <ul>
        <li><code>GET /api/products</code> - List all products</li>
        <li><code>GET /api/products/search</code> - Search products</li>
        <li><code>GET /api/products/:cnNumber</code> - Get product details</li>
        <li><code>GET /api/products/:cnNumber/nutrition</code> - Get nutrition info</li>
      </ul>

      <h2>Authentication</h2>
      <p>All endpoints require an API key:</p>
      <pre style={{ background: '#f4f4f4', padding: '1rem', borderRadius: '4px' }}>
        Authorization: Bearer YOUR_API_KEY
      </pre>

      <h2>Documentation</h2>
      <p>See the <a href="https://github.com/yourusername/cn-v2/blob/main/README.md">README.md</a> for complete documentation.</p>
    </main>
  )
}
