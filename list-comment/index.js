const Knex = require('knex');
const _ = require('lodash');

const connection = {
    host: process.env.SAEUM_DB_HOST,
    user: process.env.SAEUM_DB_USER,
    password: process.env.SAEUM_DB_PASSWORD,
    database: process.env.SAEUM_DB_DATABASE,
    port: process.env.SAEUM_DB_PORT
};

const knex = Knex({
    client: 'mysql',
    connection,
});

const okResponse = (data) => {
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
        },
        body: JSON.stringify(data),
    };
};

const errorResponse = (code, message) => {
    return {
        statusCode: code,
        headers: {
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
        },
        body: JSON.stringify({ code, message }),
    };
};

exports.handler = async (event) => {
    try {
        const { offset, limit } = event.queryStringParameters ? event.queryStringParameters : {};
        
        const total = await knex('comment').count('id as count');
        
        const query = knex('comment');
        if (!_.isEmpty(offset)) query.offset(parseInt(offset));
        if (!_.isEmpty(limit)) query.limit(parseInt(limit));

        const comments = await query.select().orderBy('created_at', 'desc');

        return okResponse({total: total[0].count, items: comments});
    } catch (error) {
        return errorResponse(500, '서버 에러');
    }
};
