import coreApi from "./coreApi";

function removeEmptyValues(params = {}) {
    return Object.fromEntries(
        Object.entries(params).filter(
            ([, value]) =>
                value !== "" &&
                value !== null &&
                value !== undefined
        )
    );
}

export async function getJobs(params = {}) {
    const response = await coreApi.get("/jobs", {
        params: removeEmptyValues(params),
    });

    return response.data.data;
}

export async function getNearbyJobs(params = {}) {
    const response = await coreApi.get("/jobs/nearby", {
        params: removeEmptyValues(params),
    });

    return response.data.data;
}

export async function getJobById(id, params = {}) {
    const response = await coreApi.get(`/jobs/${id}`, {
        params: removeEmptyValues(params),
    });

    return response.data.data.job;
}

/**
 * Record that a job details page was opened.
 * The backend de-duplicates per viewer within a cooldown window, so calling
 * this on every mount will not inflate the count.
 */
export async function trackJobView(id) {
    const response = await coreApi.post(`/jobs/${id}/view`);
    return response.data.data;
}

export async function geocodeCity(city, state = "", country = "India") {
    const response = await coreApi.get("/jobs/geocode", {
        params: removeEmptyValues({ city, state, country }),
    });

    return response.data.data;
}

export async function getSkills(search = "") {
    const response = await coreApi.get("/skills", {
        params: search ? { search } : {},
    });

    return response.data.data;
}