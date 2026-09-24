const express = require('express');
const { importGtfs, openDb, getDb } = require('gtfs');
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
        const db = getDb();
        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Australia/Sydney" }));
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const currentTime = `${hours}:${minutes}:${seconds}`;
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDay = days[now.getDay()];
        const query = `
            SELECT 
                st.*, r.*, t.*, s.*
            FROM stop_times st
            JOIN trips t ON st.trip_id = t.trip_id
            JOIN routes r ON t.route_id = r.route_id
            JOIN stops s ON st.stop_id = s.stop_id
            JOIN calendar c ON t.service_id = c.service_id
            WHERE st.stop_id = ? 
                AND st.departure_time >= ?
                AND c.${currentDay} = 1
            GROUP BY st.departure_time, r.route_short_name
            ORDER BY st.departure_time ASC
            LIMIT 20
        `;
        
        const departures = db.prepare(query).all(req.params.stopId, currentTime);
        res.json(departures);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;

(async () => {
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
        
        openDb(config); 

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Startup error:', err.message);
    }
})();