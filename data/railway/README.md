# Station directory

`stations.geojson` is the station feature collection from [DataMeet's Indian Railways dataset](https://github.com/datameet/railways).

- License: CC0 1.0 Universal, as stated by the source repository.
- Included fields: station name, station code, state, zone, address, and coordinates where supplied.
- The source does not declare a capture date and has an [open request for a refreshed station extract](https://github.com/datameet/railways/issues/7). Treat this as a useful offline directory snapshot, not authoritative current railway operations data. Confirm current station codes, schedules, fares, PNR, and availability with Indian Railways.

The app serves this file through `/api/stations` and `/api/stations/{code}`. `/api/station-directory` reports the source and record count.
