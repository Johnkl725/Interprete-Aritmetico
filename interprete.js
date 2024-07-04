class ArithmeticInterpreter {
    constructor() {
        this.variables = {};
    }

    tokenizar(expression) {
        const tokens = [];
        let currentToken = "";
        let i = 0;

        function pushToken() {
            if (currentToken) {
                tokens.push(currentToken);
                currentToken = "";
            }
        }

        while (i < expression.length) {
            const char = expression[i];
            if (/[a-zA-Z0-9_]/.test(char)) {
                currentToken += char;
            } else if (["+","-","*", "/", "(", ")", "=", ",", "<", ">", " "].includes(char)) {
                pushToken();
                if (char !== " ") {
                    tokens.push(char);
                }
            } else if (char === "." && currentToken.match(/^\d+$/)) {
                currentToken += char;
            } else if (char === "-" && tokens[i+1]=== (currentToken === "" || tokens[tokens.length - 1] === "(")) {
                currentToken += char;
            } else {
                pushToken();
                currentToken = char;
                pushToken();
            }

            i++;
        }

        pushToken();

        return tokens;
    }

    parse(tokens) {
        const self = this;

        function parseExpression() {
            let result = parseTerm();
            while (tokens.length && ["+", "-"].includes(tokens[0])) {
                const op = tokens.shift();
                if (op === "+") {
                    result = ["add", result, parseTerm()];
                } else {
                    result = ["subtract", result, parseTerm()];
                }
            }
            return result;
        }

        function parseTerm() {
            let result = parseFactor();
            while (tokens.length && ["*", "/"].includes(tokens[0])) {
                const op = tokens.shift();
                if (op === "*") {
                    result = ["multiply", result, parseFactor()];
                } else {
                    result = ["divide", result, parseFactor()];
                }
            }
            return result;
        }

        function parseFactor() {
            const numberPattern = /^-?\d+(\.\d+)?$/;
            if (tokens[0] === "(") {
                tokens.shift();
                const result = parseExpression();
                if (tokens.shift() !== ")") throw new Error("Cerrar los paréntesis!!!!\n");
                return result;
            } else if (tokens[0] in self.variables) {
                return ["var", tokens.shift()];
            } else {
                if (!numberPattern.test(tokens[0])) {
                    throw new Error(`Se esperaba un número, pero se encontró '${tokens[0]}'\n`);
                }
                return ["num", parseFloat(tokens.shift())];
            }
        }

        function parseAssignment() {
            const assignments = [];
            while (tokens.length) {
                const variable = tokens.shift();
                const operator = tokens.shift();
                let expr;
                if (operator === "=") {
                    expr = parseExpression();
                    assignments.push(["assign", variable, expr]);
                } else if (["+=","-=","*=","/="].includes(operator)) {
                    expr = parseExpression();
                    switch (operator) {
                        case "+=":
                            assignments.push(["assign_add", variable, expr]);
                            break;
                        case "-=":
                            assignments.push(["assign_subtract", variable, expr]);
                            break;
                        case "*=":
                            assignments.push(["assign_multiply", variable, expr]);
                            break;
                        case "/=":
                            assignments.push(["assign_divide", variable, expr]);
                            break;
                    }
                } else {
                    throw new Error("Se esperaba '=' o un operador de asignación incremental\n");
                }

                if (tokens[0] === ";") {
                    tokens.shift();
                } else {
                    break;
                }
            }
            return assignments;
        }

        function parseCout() {
            tokens.shift(); // remove 'cout'
            if (tokens.shift() !== "<" || tokens.shift() !== "<") throw new Error("Se esperaba '<<'\n");
            const expr = parseExpression();
            return ["cout", expr];
        }

        const ast = [];
        while (tokens.length) {
            if (tokens[0] === "cout") {
                ast.push(parseCout());
            } else if (/^[a-zA-Z_]\w*$/.test(tokens[0]) && tokens[1] === "=") {
                const assignments = parseAssignment();
                ast.push(...assignments);
            } else {
                ast.push(parseExpression());
            }
        }
        return ast;
    }

    evaluate(ast) {
        const self = this;
        const results = [];

        function evalNode(node) {
            if (Array.isArray(node)) {
                const op = node[0];
                switch (op) {
                    case "add":
                    case "subtract":
                    case "multiply":
                    case "divide":
                        const left = evalNode(node[1]);
                        const right = evalNode(node[2]);
                        if (typeof left !== "number" || typeof right !== "number") {
                            throw new Error("Operaciones aritméticas solo permiten números\n");
                        }
                        switch (op) {
                            case "add":
                                return left + right;
                            case "subtract":
                                return left - right;
                            case "multiply":
                                return left * right;
                            case "divide":
                                return left / right;
                        }
                        break;
                    case "assign":
                        const variable = node[1];
                        const value = evalNode(node[2]);
                        if (typeof value !== "number") {
                            throw new Error("Asignación solo permite números\n");
                        }
                        self.variables[variable] = value;
                        return value;
                    case "assign_add":
                    case "assign_subtract":
                    case "assign_multiply":
                    case "assign_divide":
                        const varName = node[1];
                        const incValue = evalNode(node[2]);
                        if (typeof incValue !== "number") {
                            throw new Error("Asignación incremental solo permite números\n");
                        }
                        if (!(varName in self.variables)) {
                            throw new Error(`Variable '${varName}' no definida\n`);
                        }
                        switch (op) {
                            case "assign_add":
                                self.variables[varName] += incValue;
                                break;
                            case "assign_subtract":
                                self.variables[varName] -= incValue;
                                break;
                            case "assign_multiply":
                                self.variables[varName] *= incValue;
                                break;
                            case "assign_divide":
                                self.variables[varName] /= incValue;
                                break;
                        }
                        return self.variables[varName];
                    case "var":
                        if (!(node[1] in self.variables)) {
                            throw new Error(`Variable '${node[1]}' no definida\n`);
                        }
                        return self.variables[node[1]];
                    case "num":
                        return node[1];
                    case "cout":
                        const exprResult = evalNode(node[1]);
                        if (typeof exprResult === "number") {
                            results.push({ type: "cout", value: exprResult });
                        } else if (typeof exprResult === "string" && exprResult in self.variables) {
                            results.push({ type: "cout", value: self.variables[exprResult] });
                        } else {
                            results.push({ type: "error", value: `Error: expresión '${exprResult}' no válida.` });
                        }
                        return null;
                }
            } else {
                return node;
            }
        }

        for (const node of ast) {
            const result = evalNode(node);
            if (result !== null && result !== undefined) {
                results.push({ type: "result", value: result });
            }
        }

        return results;
    }

    validarExpresion(expression) {
        const simboloInvalido = /\/\s*$/;
        const divisionEntreCero = /\/\s*0/;  
        if (simboloInvalido.test(expression)) {
            throw new Error("Expresión incompleta: no se puede terminar con una operación de división\n");
        }
        if (divisionEntreCero.test(expression)) {
            throw new Error("No se puede dividir entre cero\n");
        }
    }

    interpret(expression) {
        this.validarExpresion(expression);
        const tokens = this.tokenizar(expression);
        const ast = this.parse(tokens);
        return this.evaluate(ast);
    }
}

function interpretCode() {
    const interpreter = new ArithmeticInterpreter();
    const codeInput = document.getElementById("codeInput");
    const code = codeInput.value.trim();
    const outputElement = document.getElementById("output");
    
    outputElement.textContent = "";

    const lines = code.split("\n");
    let coutOutputs = "";

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine === "") {
            continue;
        }
        try {
            const results = interpreter.interpret(trimmedLine);
            for (const result of results) {
                if (result.type === "cout") {
                    coutOutputs += `${result.value}\n`;
                } else if (result.type === "error") {
                    outputElement.textContent += `Error para '${trimmedLine}': ${result.value}\n`;
                }
            }
        } catch (error) {
            outputElement.textContent += `Error para '${trimmedLine}': ${error.message}\n`;
        }
    }

    outputElement.textContent += coutOutputs;
}
