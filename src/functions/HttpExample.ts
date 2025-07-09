import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function HttpExample(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    try {
        // Get name from query parameter, request body, or default to 'world'
        let name: string;
        
        if (request.method === 'GET') {
            name = request.query.get('name') || 'world';
        } else if (request.method === 'POST') {
            const body = await request.text();
            try {
                const jsonBody = JSON.parse(body);
                name = jsonBody.name || body || 'world';
            } catch {
                name = body || 'world';
            }
        } else {
            name = 'world';
        }

        const response = {
            message: `Hello, ${name}!`,
            timestamp: new Date().toISOString(),
            method: request.method,
            url: request.url
        };

        return { 
            status: 200,
            jsonBody: response,
            headers: {
                'Content-Type': 'application/json'
            }
        };
    } catch (error) {
        context.log('Error processing request:', error);
        
        return {
            status: 500,
            jsonBody: {
                error: 'Internal server error',
                message: 'An error occurred while processing your request'
            },
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};

app.http('HttpExample', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: HttpExample
});
