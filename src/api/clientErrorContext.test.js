import {captureClientErrorContext,safeClientErrorContext} from './clientErrorContext';
test('captures reviewed menu prefixes without IDs, query or free text',()=> {
 expect(captureClientErrorContext('/admin/stores/private-id').screen).toBe('AdminStores');
 expect(captureClientErrorContext('/admin/api-registry').screen).toBe('AdminApiRegistry');
 expect(captureClientErrorContext('/admin/unknown/private').screen).toBeNull();
 expect(safeClientErrorContext({screen:'user-secret',occurredAt:'private'})).toEqual({screen:null});
});
