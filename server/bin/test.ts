
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Filter, Options, RequestHandler } from 'http-proxy-middleware';

try {

    const app = express();

    const proxyMiddleware = createProxyMiddleware<Request, Response>({
        target: 'http://localhost:8080/test',
        // target: 'http://localhost:9000',
        changeOrigin: false,
    })
    
    app.use('*', proxyMiddleware);
    
    console.log('Server listening on localhost:3000')
    app.listen(3001);
    
    // proxy and keep the same base path "/api"
    // http://127.0.0.1:3000/api/foo/bar -> http://www.example.org/api/foo/bar
    
} catch (e) {
    console.error(e)
}