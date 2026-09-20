const express = require('express');
const { importGtfs, getStoptimes } = require('gtfs');
const fs = require('fs/promises');
const app = express();
const cors = require('cors');
app.use(cors());

const config = {
    sqlitePath: './gtfs.db',
    agencies: [{ 
        path: './gtfs.zip' 
    }]
};

app.get('/departures/:stopId', async (req, res) => {
    try {
        const departures = getStoptimes({ stop_id: req.params.stopId }, [], [['departure_time', 'ASC']]);
        res.json(departures.slice(0, 10));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    try {
        console.log('Downloading GTFS data...');
        const response = await fetch('https://transport.api.act.gov.au/gtfs/data/gtfs/v2/gtfs.zip', {
            headers: { 'Authorization': `Basic ${process.env.API_KEY}` }
        });

        if (!response.ok) {
            throw new Error(`GTFS Download failed with status ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        await fs.writeFile('./gtfs.zip', Buffer.from(buffer));

        console.log('Importing GTFS data...');
        await importGtfs(config);
        console.log(`Server running on port ${PORT}`);
    } catch (err) {
        console.error('Startup error:', err.message);
    }
});