import { describe, it, expect, vi, beforeEach } from 'vitest';
import { httpClient } from './HttpClient';

describe('HttpClient', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
        vi.stubGlobal('location', { href: '' });
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('should include Authorization header if token exists', async () => {
        localStorage.setItem('token', 'fake-token');
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ data: 'success' }),
        } as unknown as Response);

        await httpClient.get('/test');

        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/test'),
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'Bearer fake-token',
                }),
            })
        );
    });

    it('should handle 401 Unauthorized by clearing storage and invoking callback', async () => {
        const mockCallback = vi.fn();
        httpClient.setUnauthorizedCallback(mockCallback);
        vi.mocked(fetch).mockResolvedValue({
            ok: false,
            status: 401,
        } as unknown as Response);

        await expect(httpClient.get('/test')).rejects.toThrow('Sesión expirada');
        
        expect(mockCallback).toHaveBeenCalled();
    });

    it('should throw error with message from response if not ok', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: false,
            status: 400,
            json: async () => ({ message: 'Bad Request Parameter' }),
        } as unknown as Response);

        await expect(httpClient.get('/test')).rejects.toThrow('Bad Request Parameter');
    });

    it('should append params to URL', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({}),
        } as unknown as Response);

        await httpClient.get('/test', { params: { id: 123, q: 'search' } });

        const urlCall = vi.mocked(fetch).mock.calls[0][0];
        expect(urlCall).toContain('id=123');
        expect(urlCall).toContain('q=search');
    });

    it('should handle FormData without setting Content-Type', async () => {
        const formData = new FormData();
        formData.append('file', new Blob(['test'], { type: 'text/plain' }));

        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({}),
        } as unknown as Response);

        await httpClient.post('/upload', formData);

        const configCall = vi.mocked(fetch).mock.calls[0][1]!;
        expect(configCall.body).toBeInstanceOf(FormData);
        expect((configCall.headers as Record<string, string | undefined>)['Content-Type']).toBeUndefined();
    });

    it('should set Content-Type to application/json for non-FormData bodies', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({}),
        } as unknown as Response);

        await httpClient.post('/test', { key: 'value' });

        const configCall = vi.mocked(fetch).mock.calls[0][1]!;
        expect((configCall.headers as Record<string, string | undefined>)['Content-Type']).toBe('application/json');
        expect(configCall.body).toBe(JSON.stringify({ key: 'value' }));
    });
});
