import React from "react";
import { Link } from "gatsby";

import Layout from "../components/layout"
import SEO from "../components/seo"

const IndexPage = () => {
    return (
        <Layout>
            <SEO title="Home" />
            <Link to="/corona/">COVID-19 Graph</Link>
            <p>More cool stuff coming eventually...</p>
        </Layout>
    )
}

export default IndexPage
