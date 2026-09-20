const express = require('express');
const { importGtfs, getStoptimes } = require('gtfs');
const app = express();

const config = {
    sqlitePath: './gtfs.db',
    agencies: [{ 
    url: 'https://transport.api.act.gov.au/gtfs/data/gtfs/v2/gtfs.zip',
    headers: { 'Authorization': `Basic ${process.env.API_KEY}` }
    }]
};

app.get('/departures/:stopId', async (req, res) => {
    try {
    const departures = getStoptimes({ stop_id: req.params.stopId }, [], { sort: { departure_time: 1 } });
    res.json(departures.slice(0, 10));
    } catch (err) {
    res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log('Importing GTFS data...');
    await importGtfs(config);
    console.log(`Server running on port ${PORT}`);
});