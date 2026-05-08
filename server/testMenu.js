const API_URL = 'http://localhost:5000/api/menu';

const testMenuCRUD = async () => {
    try {
        console.log('--- Testing Create ---');
        const createRes = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Item ' + Date.now(),
                category: 'Main Course',
                price: 500,
                description: 'Test description',
                isAvailable: true
            })
        });
        const createData = await createRes.json();
        if (!createRes.ok) throw new Error('Create failed: ' + JSON.stringify(createData));
        const itemId = createData._id;
        console.log('Created:', itemId);

        console.log('--- Testing Update ---');
        const updateRes = await fetch(`${API_URL}/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                price: 600,
                isAvailable: false
            })
        });
        const updateData = await updateRes.json();
        if (!updateRes.ok) throw new Error('Update failed: ' + JSON.stringify(updateData));
        console.log('Updated Price:', updateData.price);
        console.log('Updated Status:', updateData.isAvailable);

        console.log('--- Testing Delete ---');
        const deleteRes = await fetch(`${API_URL}/${itemId}`, { method: 'DELETE' });
        if (!deleteRes.ok) throw new Error('Delete failed');
        console.log('Deleted successfully');

        console.log('--- All tests passed! ---');
        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error.message);
        process.exit(1);
    }
};

testMenuCRUD();
