import { Link } from "gatsby";
import PropTypes from "prop-types";
import React from "react";
import Img from "gatsby-image";
const twitter = require('../images/twitter.png');
const linkedin = require('../images/linkedin.png');
const github = require('../images/github.png');

const Header = ({ siteTitle }) => (
  <header
    style={{
      background: `rebeccapurple`,
      marginBottom: `1.45rem`,
    }}
  >
    <div
      style={{
        margin: `0 auto`,
        maxWidth: 960,
        padding: `1.45rem 1.0875rem`,
        display: `flex`,
        flexDirection: `row`,
        justifyContent: `space-between`,
        alignItems: `center`,
      }}
    >
      <h1 style={{ margin: 0 }}>
        <Link to="/" style={{ color: `white`, textDecoration: `none`, }}>
          {siteTitle}
        </Link>
      </h1>
      <div style={{
            display: `flex`,
            flexDirection: `row`,
            justifyContent: `space-between`,
            alignItems: `center`,
        }}>
        <a href="https://www.linkedin.com/in/sethcwhiting/" target="_blank" style={{ padding: 5 }}>
            <img src={linkedin} width="30" height="30" style={{ margin: 0, display: 'block' }}/>
        </a>
        <a href="https://github.com/sethcwhiting" target="_blank" style={{ padding: 5 }}>
            <img src={github} width="30" height="30" style={{ margin: 0, display: 'block' }}/>
        </a>
        <a href="https://twitter.com/sethcwhiting" target="_blank" style={{ padding: 5 }}>
            <img src={twitter} width="30" height="30" style={{ margin: 0, display: 'block' }}/>
        </a>
      </div>
    </div>
  </header>
)

Header.propTypes = {
  siteTitle: PropTypes.string,
}

Header.defaultProps = {
  siteTitle: ``,
}

export default Header
