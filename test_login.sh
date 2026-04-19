#!/bin/bash
echo "=== Login direto no backend ==="
curl -s -w "\nHTTP:%{http_code}\n" http://localhost:5000/auth/login \
  -X POST -H "Content-Type: application/json" \
  --data-raw '{"email":"admin@finflow.dev","password":"Admin@123"}' | cut -c1-200
echo ""
echo "=== Login via nginx HTTPS ==="
curl -sk -w "\nHTTP:%{http_code}\n" https://localhost/api/auth/login \
  -X POST -H "Content-Type: application/json" \
  --data-raw '{"email":"admin@finflow.dev","password":"Admin@123"}' | cut -c1-200
echo ""
echo "=== CORS check (origin IP HTTPS) ==="
curl -sk -I -X OPTIONS "https://localhost/api/auth/login" \
  -H "Origin: https://204.216.138.73" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" 2>&1 | grep -iE "access-control|http/|200|204"
echo ""
echo "=== CORS origin configurado no backend ==="
docker exec finflow_backend env | grep -i cors
