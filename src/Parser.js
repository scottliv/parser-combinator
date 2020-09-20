"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fail = exports.success = exports.lazy = exports.sepBy1 = exports.sepBy = exports.between = exports.many1 = exports.many = exports.choice = exports.sequence = exports.floatingPoint = exports.lettersOrDigits = exports.digitsParser = exports.lettersParser = exports.stringParser = exports.Parser = exports.updateParserError = exports.updateParserResult = exports.updateParserState = void 0;
exports.updateParserState = (state, index, result) => (Object.assign(Object.assign({}, state), { index,
    result }));
exports.updateParserResult = (state, result) => (Object.assign(Object.assign({}, state), { result }));
exports.updateParserError = (state, error) => (Object.assign(Object.assign({}, state), { error, isError: true }));
class Parser {
    constructor(parserSateTransformer) {
        this.parserStateTransformer = parserSateTransformer;
    }
    runParserStateTransformer(targetString) {
        const initialState = {
            targetString,
            index: 0,
            result: null,
            isError: false,
            error: "",
        };
        return this.parserStateTransformer(initialState);
    }
    map(func) {
        return new Parser((parserState) => {
            const nextState = this.parserStateTransformer(parserState);
            if (nextState.isError) {
                return nextState;
            }
            return exports.updateParserResult(nextState, func(nextState.result));
        });
    }
    chain(func) {
        return new Parser((parserState) => {
            const nextState = this.parserStateTransformer(parserState);
            if (nextState.isError) {
                return nextState;
            }
            const nextParser = func(nextState.result);
            return nextParser.parserStateTransformer(nextState);
        });
    }
    errorMap(func) {
        return new Parser((parserState) => {
            const nextState = this.parserStateTransformer(parserState);
            if (!nextState.isError) {
                return nextState;
            }
            return exports.updateParserError(nextState, func(nextState.error));
        });
    }
}
exports.Parser = Parser;
exports.stringParser = (str) => new Parser((parserState) => {
    const { targetString, index, isError } = parserState;
    if (isError) {
        return parserState;
    }
    const sliced = targetString.slice(index);
    if (sliced.length === 0) {
        return exports.updateParserError(parserState, `Unexpected end of input`);
    }
    if (sliced.startsWith(str)) {
        return exports.updateParserState(parserState, index + str.length, str);
    }
    return exports.updateParserError(parserState, `Tried to match ${str} but got ${targetString}`);
});
const regexParser = (regex) => new Parser((parserState) => {
    const { targetString, index, isError } = parserState;
    if (isError) {
        return parserState;
    }
    const sliced = targetString.slice(index);
    if (sliced.length === 0) {
        return exports.updateParserError(parserState, `Unexpected end of input`);
    }
    const matched = sliced.match(regex);
    if (matched) {
        return exports.updateParserState(parserState, index + matched[0].length, matched[0]);
    }
    return exports.updateParserError(parserState, `Could not match regular expression at index: ${index}`);
});
exports.lettersParser = regexParser(/^[A-Za-z]+/);
exports.digitsParser = regexParser(/^[0-9]+/);
exports.lettersOrDigits = regexParser(/^[0-9A-Za-z]+/);
exports.floatingPoint = regexParser(/[-]?[0-9]*\.?[0-9]+/);
exports.sequence = (parsers) => new Parser((parserState) => {
    if (parserState.isError) {
        return parserState;
    }
    const results = [];
    let nextState = parserState;
    for (const p of parsers) {
        nextState = p.parserStateTransformer(nextState);
        results.push(nextState.result);
    }
    return exports.updateParserResult(nextState, results);
});
exports.choice = (parsers) => new Parser((parserState) => {
    if (parserState.isError) {
        return parserState;
    }
    for (const p of parsers) {
        const nextState = p.parserStateTransformer(parserState);
        if (!nextState.isError) {
            return nextState;
        }
    }
    return exports.updateParserError(parserState, `Unable to match with any parser`);
});
exports.many = (queryParser) => new Parser((parserState) => {
    if (parserState.isError) {
        return parserState;
    }
    const results = [];
    let nextState = parserState;
    let done = false;
    while (!done) {
        const testState = queryParser.parserStateTransformer(nextState);
        if (!testState.isError) {
            results.push(testState.result);
            nextState = testState;
        }
        else {
            done = true;
        }
    }
    return exports.updateParserResult(nextState, results);
});
exports.many1 = (queryParser) => new Parser((parserState) => {
    if (parserState.isError) {
        return parserState;
    }
    const results = [];
    let nextState = parserState;
    let done = false;
    while (!done) {
        const testState = queryParser.parserStateTransformer(nextState);
        if (!testState.isError) {
            results.push(testState.result);
            nextState = testState;
        }
        else {
            done = true;
        }
    }
    if (results.length === 0) {
        return exports.updateParserError(parserState, "many1: unable to match any parser");
    }
    return exports.updateParserResult(parserState, results);
});
exports.between = (leftParser, rightParser) => (contentParser) => {
    return exports.sequence([leftParser, contentParser, rightParser]).map((results) => {
        return Array.isArray(results) ? results[1] : null;
    });
};
exports.sepBy = (separatorParser) => (valueParser) => {
    return new Parser((parserState) => {
        const results = [];
        let nextState = parserState;
        while (true) {
            const valueState = valueParser.parserStateTransformer(nextState);
            if (valueState.isError) {
                break;
            }
            results.push(valueState.result);
            nextState = valueState;
            const separatorState = separatorParser.parserStateTransformer(nextState);
            if (separatorState.isError) {
                break;
            }
            nextState = separatorState;
        }
        return exports.updateParserResult(nextState, results);
    });
};
exports.sepBy1 = (separatorParser) => (valueParser) => {
    return new Parser((parserState) => {
        const results = [];
        let nextState = parserState;
        while (true) {
            const valueState = valueParser.parserStateTransformer(nextState);
            if (valueState.isError) {
                break;
            }
            results.push(results.push(valueState.result));
            nextState = valueState;
            const seperatorState = separatorParser.parserStateTransformer(nextState);
            if (seperatorState.isError) {
                break;
            }
            nextState = seperatorState;
        }
        if (results.length === 0) {
            return exports.updateParserError(parserState, `sepBy1: unable to capture any results`);
        }
        return exports.updateParserResult(nextState, results);
    });
};
exports.lazy = (parserThunk) => new Parser((parserState) => {
    const returnParser = parserThunk();
    return returnParser.parserStateTransformer(parserState);
});
exports.success = (results) => new Parser((parserState) => {
    return exports.updateParserResult(parserState, results);
});
exports.fail = (errorMessage) => new Parser((parserState) => {
    return exports.updateParserError(parserState, errorMessage);
});
//# sourceMappingURL=Parser.js.map