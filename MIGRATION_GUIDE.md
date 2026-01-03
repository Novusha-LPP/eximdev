# Open Points Module Migration Guide

To implement the Open Points module in another project, copy the files listed below and follow the integration steps.

## 1. Backend Files (Server)
Copy these files to your server directory structure:

### Models
* `server/model/openPoints/openPointModel.mjs`
* `server/model/openPoints/openPointProjectModel.mjs`

### Routes
* `server/routes/open-points/openPointsRoutes.mjs`

### Integration (app.mjs / server.js)
Register the routes in your main server file:
```javascript
import openPointsRoutes from './routes/open-points/openPointsRoutes.mjs';

// ...
app.use(openPointsRoutes);
```

## 2. Frontend Files (Client)
Copy these files to your client directory structure:

### Components
* `client/src/components/open-points/OpenPointsHome.js`
* `client/src/components/open-points/ProjectWorkspace.js`

### Service
* `client/src/services/openPointsService.js`

### Styles
* `client/src/styles/openPoints.scss`

## 3. Frontend Integration

### Dependencies
Ensure your project has the following dependencies (or compatible alternatives):
* `axios`
* `react-router-dom` (for navigation)

### Routing (App.js)
Add routes for the module:
```javascript
import OpenPointsHome from './components/open-points/OpenPointsHome';
import ProjectWorkspace from './components/open-points/ProjectWorkspace';

// ... inside <Routes>
<Route path="/open-points" element={<OpenPointsHome />} />
<Route path="/open-points/project/:projectId" element={<ProjectWorkspace />} />
```

### Context / Auth
The module expects:
* `UserContext` providing `{ user: { _id, username, role } }`.
* `localStorage` item `exim_user` (used in `openPointsService.js`).
* Basic authentication headers are handled in `openPointsService.js`.

## 4. Updates Required
* Check `client/src/services/openPointsService.js` for `API_URL` configuration (`process.env.REACT_APP_API_STRING`).
* Ensure styling (`openPoints.scss`) is imported in your main SCSS file or directly in the components (`import '../../styles/openPoints.scss'`).
