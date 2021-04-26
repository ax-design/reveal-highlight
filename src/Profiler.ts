interface ProfilerLog {
    time: number;
    task: string;
}

const downloadText = (filename: string, text: string) => {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';

    element.click();
};

export class Profiler {
    private baseline: number = 0;
    logs: ProfilerLog[] = [];

    setBaseline() {
        this.baseline = performance.now();
    }

    mark(task: string = 'unknown') {
        const time = performance.now() - this.baseline;

        this.logs.push({
            time,
            task,
        });

        this.baseline = performance.now();
    }

    dumpAsCsv() {
        let result = 'task,tile\n';

        for (let i = 0; i < this.logs.length; i++) {
            result += `${this.logs[i].task},${this.logs[i].time}\n`;
        }

        downloadText('axRevealHighlightProfileDetail.csv', result);
    }
}
