import {
  ajax,
  formatCurrency,
  forEachMonth,
  formatCurrencyCrude,
  Posting,
  secondName,
  skipTicks
} from "./utils";
import _ from "lodash";
import * as d3 from "d3";
import dayjs from "dayjs";
import legend from "d3-svg-legend";
import { ticks } from "d3";

export default async function () {
  const { postings: postings } = await ajax("/api/investment");
  _.each(postings, (p) => (p.timestamp = dayjs(p.date)));

  const svg = d3.select("#d3-investment-timeline"),
    margin = { top: 40, right: 30, bottom: 80, left: 40 },
    width =
      document.getElementById("d3-investment-timeline").parentElement
        .clientWidth -
      margin.left -
      margin.right,
    height = +svg.attr("height") - margin.top - margin.bottom,
    g = svg
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  const groups = _.uniq(_.map(postings, (p) => secondName(p.account)));
  const groupKeys = _.flatMap(groups, (g) => [g + "-credit", g + "-debit"]);

  const defaultValues = _.zipObject(
    groupKeys,
    _.map(groupKeys, () => 0)
  );
  const start = dayjs("01-Oct-2014", "DD-MMM-YYYY"),
    end = dayjs().startOf("month");
  const ts = _.groupBy(postings, (p) => p.timestamp.format("YYYY-MM"));

  let points: { date: dayjs.Dayjs; month: string; [key: string]: number }[] =
    [];

  forEachMonth(start, end, (month) => {
    const values = _.chain(ts[month.format("YYYY-MM")] || [])
      .groupBy((t) => secondName(t.account))
      .flatMap((postings, key) => [
        [
          key + "-credit",
          _.sum(
            _.filter(
              _.map(postings, (p) => p.amount),
              (a) => a >= 0
            )
          )
        ],
        [
          key + "-debit",
          _.sum(
            _.filter(
              _.map(postings, (p) => p.amount),
              (a) => a < 0
            )
          )
        ]
      ])
      .fromPairs()
      .value();

    points.push(
      _.merge(
        {
          month: month.format("MMM-YYYY"),
          date: month
        },
        defaultValues,
        values
      )
    );
  });

  const x = d3
    .scaleBand()
    .rangeRound([0, width])
    .paddingInner(0.1)
    .paddingOuter(0);

  const y = d3.scaleLinear().rangeRound([height, 0]);

  const sum = (filter) => (p) =>
    _.sum(
      _.filter(
        _.map(groupKeys, (k) => p[k]),
        filter
      )
    );
  x.domain(points.map((p) => p.month));
  y.domain([
    d3.min(
      points,
      sum((a) => a < 0)
    ),
    d3.max(
      points,
      sum((a) => a > 0)
    )
  ]);

  const z = d3.scaleOrdinal<string>().range(d3.schemeCategory10);

  g.append("g")
    .attr("class", "axis x")
    .attr("transform", "translate(0," + height + ")")
    .call(
      d3
        .axisBottom(x)
        .ticks(5)
        .tickFormat(skipTicks(30, width, points.length, (d, i) => d.toString()))
    )
    .selectAll("text")
    .attr("y", 10)
    .attr("x", -8)
    .attr("dy", ".35em")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  g.append("g")
    .attr("class", "axis y")
    .call(d3.axisLeft(y).tickSize(-width).tickFormat(formatCurrencyCrude));

  g.append("g")
    .selectAll("g")
    .data(d3.stack().offset(d3.stackOffsetDiverging).keys(groupKeys)(points))
    .enter()
    .append("g")
    .attr("fill", function (d) {
      return z(d.key.split("-")[0]);
    })
    .selectAll("rect")
    .data(function (d) {
      return d;
    })
    .enter()
    .append("rect")
    .attr("x", function (d) {
      return x((d.data as any).month);
    })
    .attr("y", function (d) {
      return y(d[1]);
    })
    .attr("height", function (d) {
      return y(d[0]) - y(d[1]);
    })
    .attr("width", x.bandwidth());

  svg
    .append("g")
    .attr("class", "legendOrdinal")
    .attr("transform", "translate(40,0)");

  var legendOrdinal = legend
    .legendColor()
    .shape("rect")
    .orient("horizontal")
    .shapePadding(100)
    .labels(groups)
    .scale(z);

  svg.select(".legendOrdinal").call(legendOrdinal as any);
}
